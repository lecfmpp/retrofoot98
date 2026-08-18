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
    <div class="rf-wiz-mid">
      <div class="rf-esc-grid tres">${RF_MOEDAS.map(m=>rfEscolha({
        ico:m.ico, titulo:m.t, valor:base?rfMoedaFmt(m,base):'—', sub:m.sub, on:cur===m.k,
        acao:`rfMoedaSel('${m.k}')`
      })).join('')}</div>
      <span class="rf-wiz-nota-c">O valor mostrado é o caixa inicial típico da divisão de entrada, convertido.</span>
    </div>`;
  return rfWiz({
    titulo:'Em que moeda você quer jogar?', sub:'Vale para salários, transferências e o caixa do clube. Dá para trocar depois nas opções.', passo:rfPasso('País e liga','solo'), trilha:'solo', corpo, nota:'Você pode trocar depois em Clube & Sistema.',
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
  return rfWiz({
    titulo:'Onde você vai treinar?', sub:'O país define as divisões, as copas e o calendário do save.', passo:rfPasso('País e liga','solo'), trilha:'solo', corpo, nota:'Mais países entram nas próximas atualizações.',
    voltar:'clGoPaises()', voltarLabel:'‹ Voltar ao modo',
    cta:`Continuar com ${sel||'o país'}`, ctaCurto:'Continuar', ctaOff:!sel, ctaOn:'clPaisJogavelOk()' });
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
  const splash=rfAdEspaco('rf98.loading.splash',{cls:'rf-ad-splash',formato:'16:9'});
  const corpo=`
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
  return rfWiz({
    sobre:'A preparar o seu save', titulo:'Carregando jogo', sub:'Montando as divisões, os elencos e o calendário da temporada.', semTrilha:true, corpo });
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
    <div class="rf-wiz-mid">
      <div class="rf-esc-grid quatro">${[1,2,3,4].map(cartao).join('')}</div>
      <div class="rf-esc-grid quatro">${[5,6,7,8].map(cartao).join('')}</div>
      <div class="rf-tr-nomes">
        ${(CL.names||['']).slice(0,n).map((nm,i)=>rfCampo(i===0?'Treinador 1 (você)':'Treinador '+(i+1),
          `<input class="rf-campo-c maiuscula" ${i===0?'id="cl-focus"':''} maxlength="12" placeholder="TREINADOR"
             value="${escC(nm||'')}" oninput="rfNomeTreinador(${i},this.value)">`)).join('')}
      </div>
      <!-- A IDADE DO TREINADOR DEIXA DE SER INVENTADA. A ficha em Treinador
           mostrava "36 anos" para toda a gente: o numero saia de uma conta fixa
           (36 + temporadas-1) porque o dado nao existia. Agora escolhe-se aqui,
           uma vez, e a partir dai ele envelhece uma temporada de cada vez. -->
      ${rfCampo('A sua idade (25 a 75)',
        `<input class="rf-campo-c" id="rf-ob-idade" inputmode="numeric" maxlength="2" placeholder="36"
           value="${escC(String(CL.coachAge||36))}" oninput="rfIdadeTreinador(this.value)">`)}
      ${RF_HOTSEAT_LIGADO?'':`<div class="rf-aviso"><span class="rf-aviso-i">${rfIcone('elenco',16)}</span>
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
  return rfWiz({
    titulo:'Quantos treinadores na sala?', sub:'Cada treinador comanda um clube. Os outros ficam com a máquina.', passo:rfPasso('País e liga','solo'), trilha:'solo', corpo,
    nota:'Os clubes que sobram ficam com a máquina.',
    voltar:'clGoMoeda()', voltarLabel:'‹ Voltar à moeda',
    cta:`Continuar com ${n}`, ctaCurto:'Continuar', ctaOn:'clEscolherClubes()' });
}
function rfTreinadoresSel(k){
  CL.names=CL.names||[];
  while(CL.names.length<k) CL.names.push('TREINADOR '+(CL.names.length+1));
  CL.names=CL.names.slice(0,k);
  if(!CL.names[0]) CL.names[0]=(CL.mgr||'TREINADOR').toUpperCase();
  cdraw();
}
/* NÃO redesenha. Com `cdraw()` aqui o campo era destruído e reconstruído a cada
   tecla: o cursor voltava para a posição 0 e o texto saía ao contrário, letra
   nova sempre na frente, e o Delete apagava o caractere errado. Nada nesta tela
   depende do nome digitado (o grid é de contagem, o CTA diz "Continuar com N"),
   então guardar no estado basta. O MAIÚSCULO agora é do CSS (.maiuscula): mexer
   em `this.value` empurraria o cursor pro fim no meio de uma edição. */
function rfNomeTreinador(i,v){ CL.names[i]=String(v||'').toUpperCase(); }
/* SEM cdraw(): redesenhar por tecla devolve o cursor ao inicio do campo e o
   numero sai invertido (a mesma armadilha do nome do treinador). */
function rfIdadeTreinador(v){
  const n=parseInt(String(v||'').replace(/\D/g,''),10);
  CL.coachAge=isFinite(n)?n:null;
}
function rfIdadeTreinadorValida(){
  const n=CL.coachAge;
  return (isFinite(n)&&n>=25&&n<=75)?n:36;
}
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
      <div class="rf-wiz-mid">
        <div class="rf-cb-head"><span>TREINADOR</span><span>PAÍS</span></div>
        ${pick.map((p,i)=>`<div class="rf-cb-lin">
          <span class="rf-cb-n">${escC(p.name)}${i===0?' <i>(você)</i>':''}</span>
          <select class="rf-campo-c" onchange="clPickCountry(${i},this.value)">
            ${paises.map(c=>`<option value="${escC(c)}" ${p.country===c?'selected':''}>${escC(c)}</option>`).join('')}
          </select>
        </div>`).join('')}
      </div>`;
    return rfWiz({ corpo, passo:rfPasso('Clube'), titulo:'De onde sai cada clube?',
      sub:'Cada treinador escolhe o país. O clube é sempre sorteado — ninguém escolhe o próprio time.',
      nota:'Os clubes restantes ficam com a máquina.',
      voltar:'clGoJogadores()', voltarLabel:'‹ Voltar aos treinadores',
      cta:rfIcone('sorteio',16)+' Sortear os clubes', ctaCurto:rfIcone('sorteio',16)+' Sortear', ctaOn:'clSortearPick()' });
  }

  const corpo=`
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
  return rfWiz({ corpo, passo:rfPasso('Clube'), titulo:'Times sorteados!',
    sub:'O sorteio distribuiu os clubes entre os treinadores. Confira antes de começar.',
    nota:'Os demais clubes ficam com a máquina.',
    voltar:'clSortearPick()', voltarLabel:rfIcone('sorteio',16)+' Sortear de novo',
    cta:rfIcone('jogar',16)+' Começar a temporada', ctaCurto:rfIcone('jogar',16)+' Começar', ctaOn:'startSoloDraw()' });
}
function rfDivDoClube(c){
  const d=c.div||c.division||c.lg;
  return d?((typeof divisionLabelOf==='function')?divisionLabelOf(d):('Série '+d)):'—';
}

/* =====================================================================
   6 · CONTINUAR UM SAVE (passo 2 — é onde o Modo Solo se abre)
   ===================================================================== */
/* rfSavesHTML() VIVIA AQUI — uma SEGUNDA implementacao desta mesma tela, com
   desenho proprio. So era alcancavel por scSoloCont(), que por sua vez so era
   chamada por clSoloContinue() — o caminho que nunca funcionou (o roteador
   nunca leu CL.soloStep). Duas versoes da mesma tela e como se descobre tarde
   que se andou a medir a errada: removida, fica so rfObSoloHTML. */
function rfSaveClube(s){
  const st=(s&&s.state)||{};
  return st.clubName||st.club||s.club||s.name||s.save_name||'Jogo salvo';
}
function rfSaveOnde(s){
  const st=(s&&s.state)||{};
  const serie=st.divisionLabel||st.division||s.division||'';
  const ano=st.season||s.season||'';
  const base=[serie,ano].filter(Boolean).join(' · ');
  const q=rfSaveQuando(s);
  return base?`${base} · ${q}`:q;
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
    <div class="rf-wiz-mid">
      <div class="rf-wiz-form">
        ${rfCampo('E-mail da conta',
          `<input class="rf-campo-c" id="cl-focus" type="email" inputmode="email" autocomplete="email"
             placeholder="voce@exemplo.com" value="${escC(email)}"
             oninput="CL._resetEmail=this.value" onkeydown="if(event.key==='Enter')clSendResetLink()">`)}
        <div class="rf-aviso"><span class="rf-aviso-i">${rfIcone('email',16)}</span>
          <span>O link vale por 30 minutos. Se não chegar, confira o spam antes de pedir outro.</span></div>
      </div>
    </div>`;
  return rfWiz({ semTrilha:true, corpo,
    sobre:'Acesso à conta', titulo:'Esqueceu a senha?',
    sub:'Coloque o e-mail da conta. Enviamos um link para você criar uma nova.',
    nota:'Os seus saves na nuvem continuam intactos.',
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
  return rfWiz({ semTrilha:true, corpo,
    sobre:'Acesso à conta', titulo:'Crie uma senha nova',
    sub:'Mínimo de 6 caracteres. Depois disso já dá para entrar.',
    nota:'Os seus saves na nuvem continuam intactos.',
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
      <button type="button" class="rf-ov-cta" onclick="clGoModo()">${rfIcone('jogar',16)} Jogar agora</button>`
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
    +`<div class="rf-in-ct"><span>${rfIcone('email',16)}</span><span class="rf-in-mono">contato@retrofoot98.com</span></div>
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
      w:560, glyph:rfIcone('festa',16)+'',
      footer:`<button type="button" class="rf-ov-b2" onclick="clWaitlistClose()">Fechar</button>
        <div class="rf-sp"></div>
        <button type="button" class="rf-ov-cta" ${CL.waitlistBusy?'disabled':''}
          onclick="clWaitlistIndicar()">${CL.waitlistBusy?'Gravando':'Enviar indicações'}</button>`
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
      ${CL.waitlistErr?`<div class="rf-aviso erro"><span class="rf-aviso-i">${rfIcone('aviso',16)}</span><span>${escC(CL.waitlistErr)}</span></div>`:''}
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
        ${rfClubeCampoHTML()}
        ${rfCampo('O que não pode faltar no RetroFoot? (opcional)',
          `<input class="rf-campo-c" type="text" placeholder="Fala o recurso que você quer ver no jogo"
             value="${escC(w.resposta||'')}" oninput="clWaitlistSet('resposta',this.value)"
             onkeydown="if(event.key==='Enter')clWaitlistSubmit()">`)}
      </div>
    </div>`, {
    w:560, glyph:rfIcone('copiar',16)+'',
    footer:`<span class="rf-im-auto">A gente só usa os seus dados pra avisar da vaga.</span>
      <div class="rf-sp"></div>
      <button type="button" class="rf-ov-cta" ${CL.waitlistBusy?'disabled':''}
        onclick="clWaitlistSubmit()">${CL.waitlistBusy?'Gravando':'Garantir minha vaga'}</button>`
  });
}

/* =====================================================================
   TIME DE CORAÇÃO — dropdown com busca (modal da Lista de Espera)
   Os 80 clubes são os MESMOS que o jogo conhece no Brasil (as quatro
   divisões de elifoot_v3.division_clubs), embutidos aqui de propósito:
   o formulário é de conversão e não pode depender de uma ida ao banco
   antes da pessoa conseguir responder.
   A busca NÃO redesenha o modal — troca só o miolo da lista. Redesenhar
   destrói o campo e joga o cursor pra posição 0 (foi o defeito do nome do
   treinador no passo 3), e aqui seria o mesmo bug.
   ===================================================================== */
const RF_CLUBES_BR=[
  ['Série A',['Athletico PR','Atlético MG','Bahia','Botafogo','Bragantino','Chapecoense','Corinthians',
    'Coritiba','Cruzeiro','Flamengo','Fluminense','Grêmio','Internacional','Mirassol','Palmeiras',
    'Remo','Santos','São Paulo','Vasco','Vitória']],
  ['Série B',['América MG','Athletic Club','Atlético GO','Avaí','Botafogo-SP','Ceará','CRB','Criciúma',
    'Cuiabá','Fortaleza','Goiás','Juventude','Londrina','Náutico','Novorizontino','Operário-PR',
    'Ponte Preta','São Bernardo','Sport','Vila Nova']],
  ['Série C',['Amazonas','Anápolis GO','Barra','Botafogo PB','Brusque','Caxias do Sul','Confiança',
    'Ferroviária','Figueirense','Floresta','Guarani','Inter de Limeira','Itabaiana','Ituano','Maranhão',
    'Maringá','Paysandu','Santa Cruz','Volta Redonda','Ypiranga']],
  ['Série D',['ABC','Águia de Marabá','América RN','ASA','Capital','Cianorte','CRAC','CSA','Ferroviário',
    'Gama','Luverdense','Marcílio Dias','Nacional','Portuguesa Carioca','Portuguesa de Desportos',
    'São José','Treze','Uberlândia','Velo Clube','XV de Piracicaba']],
];
/* "sao paulo" tem que achar "São Paulo": tira acento dos dois lados */
function rfSemAcento(s){
  return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
}
function rfClubeListaHTML(q){
  const busca=rfSemAcento(q);
  const escolhido=(CL.waitlist&&CL.waitlist.clube)||'';
  let achou=0;
  const grupos=RF_CLUBES_BR.map(([div,times])=>{
    const hits=times.filter(t=>!busca||rfSemAcento(t).includes(busca));
    if(!hits.length) return '';
    achou+=hits.length;
    return `<div class="rf-cbx-grupo"><span class="rf-cbx-div">${escC(div)}</span>${
      hits.map(t=>`<button type="button" class="rf-cbx-op ${t===escolhido?'sel':''}"
        onclick="rfClubeEscolhe(${JSON.stringify(t).replace(/"/g,'&quot;')})">${escC(t)}</button>`).join('')
    }</div>`;
  }).join('');
  // clube fora da lista ainda é resposta válida: quem torce pro time da várzea
  // não pode ficar sem responder só porque o jogo ainda não tem o escudo dele
  const livre=(q||'').trim();
  const solto = (!achou && livre)
    ? `<button type="button" class="rf-cbx-op livre"
        onclick="rfClubeEscolhe(${JSON.stringify(livre).replace(/"/g,'&quot;')})">Usar “${escC(livre)}”</button>`
    : '';
  return grupos+solto || '<div class="rf-cbx-vazio">Digita o nome do teu time.</div>';
}
function rfClubeCampoHTML(){
  const v=(CL.waitlist&&CL.waitlist.clube)||'';
  const aberto=!!CL.waitlistClubeOpen;
  return rfCampo('Time de coração (opcional)', `<div class="rf-cbx ${aberto?'aberto':''}" onclick="event.stopPropagation()">
    <button type="button" class="rf-campo-c rf-cbx-gatilho ${v?'':'vazio'}"
      aria-expanded="${aberto}" onclick="rfClubeDropToggle()">
      <span class="rf-cbx-val">${v?escC(v):'Escolhe o teu time'}</span>
      ${rfIcone(aberto?'seta-cima':'seta-baixo',16)}
    </button>
    ${aberto?`<div class="rf-cbx-pop">
      <div class="rf-cbx-busca">${rfIcone('buscar',15)}
        <input id="rf-cbx-q" type="text" placeholder="Buscar clube" autocomplete="off"
          oninput="rfClubeFiltra(this.value)"
          onkeydown="if(event.key==='Escape'){event.stopPropagation();rfClubeDropToggle();}">
      </div>
      <div class="rf-cbx-lista" id="rf-cbx-lista">${rfClubeListaHTML('')}</div>
    </div>`:''}
  </div>`);
}
function rfClubeDropToggle(){
  CL.waitlistClubeOpen=!CL.waitlistClubeOpen;
  rfWaitlistDraw();
  if(CL.waitlistClubeOpen){
    const q=document.getElementById('rf-cbx-q');
    if(q){ q.focus(); const pop=q.closest('.rf-cbx'); if(pop&&pop.scrollIntoView) pop.scrollIntoView({block:'nearest'}); }
  }
}
/* só o miolo da lista — ver o comentário do topo sobre o cursor */
function rfClubeFiltra(q){
  const alvo=document.getElementById('rf-cbx-lista');
  if(alvo) alvo.innerHTML=rfClubeListaHTML(q);
}
function rfClubeEscolhe(nome){
  CL.waitlist=CL.waitlist||{};
  CL.waitlist.clube=nome;
  CL.waitlistClubeOpen=false;
  rfWaitlistDraw();
}

/* =====================================================================
   PASSO 2 · COMO VOCÊ QUER COMEÇAR  (Modo Solo)
   Substitui DUAS telas da pele antiga que ainda apareciam por dentro do
   assistente novo: a escolha "Novo jogo / Continuar" (scSoloModo) e a de
   nomear o save (scSoloNovo, o "EX: SAVE01"). O desenho novo junta as duas
   coisas numa tela só — os dois cartões em cima e os saves recentes logo
   abaixo, sem precisar de um passo extra só pra digitar um nome.
   ===================================================================== */
function rfObSoloHTML(){
  /* SEM BIFURCACAO. Havia dois cartoes ("Novo jogo" / "Continuar") por cima da
     lista de saves, e tres coisas erradas neles:

     · "Novo jogo" nascia aceso — `CL.soloEscolha` e LIDO aqui e nunca escrito
       em lado nenhum, entao a condicao dava sempre true. Parecia selecao, mas
       os cartoes sao acoes diretas: nada estava selecionado.
     · "Continuar" nao fazia nada. clSoloContinue() poe CL.soloStep='cont' e
       redesenha — mas o roteador ('modosolo') nunca le CL.soloStep, entao a
       mesma tela voltava identica. scSoloCont(), que desenharia a lista, ficou
       orfa.
     · e o cartao anunciava "7 passos", quando a regua do Solo tem 6.

     A lista ja responde a pergunta que os cartoes faziam: quem quer continuar
     toca no save, quem quer comecar toca na ultima linha. Um passo a menos
     para quem so quer voltar ao jogo. */
  const carregando = CL.soloSaves==null;
  const saves=(CL.soloSaves||[]).slice()
    .sort((a,b)=>new Date(b.updated_at||0)-new Date(a.updated_at||0));
  const n=saves.length;

  const linha=(s,i)=>{
    const st=s.state||{};
    const nome=s.name||s.save_name||'';
    /* SEM cair no nome do save: sem clube identificado a linha mostrava
       "SAVE05 / SAVE05", o mesmo texto duas vezes. O nome do save ja e a
       segunda linha; aqui fica o clube ou nada. */
    const clube=st.clubName||st.club||s.club||'';
    const serie=st.divisionLabel||st.division||s.division||'';
    const ano=st.season||s.season||'';
    const onde=st.roundLabel||(st.round?`${st.round}ª jornada`:'')||s.round_label||'';
    const sub=[serie,ano].filter(Boolean).join(' · ');
    return `<div class="rf-sv2 ${i===0?'me':''}" role="button" tabindex="0"
      onclick="clLoadSave('${escC(nome).replace(/'/g,"\\'")}')"
      onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();clLoadSave('${escC(nome).replace(/'/g,"\\'")}')}">
      <span class="rf-sv2-cr">${rfSaveEscudoHTML(st)}</span>
      <span class="rf-sv2-id">
        <span class="rf-sv2-n">${escC(clube||nome||'—')}</span>
        <span class="rf-sv2-s">${escC(clube ? [sub,nome].filter(Boolean).join(' · ') : sub)}</span>
      </span>
      <span class="rf-sv2-onde">${escC(onde)}</span>
      <span class="rf-sv2-q">${escC(rfSaveQuando(s))}</span>
      <span class="rf-sv2-b ${i===0?'forte':''}">${i===0?'Continuar':'Abrir'}</span>
      <button type="button" class="rf-sv2-x" title="Apagar este jogo"
        onclick="event.stopPropagation();clDeleteSave('${escC(nome).replace(/'/g,"\\'")}')">${rfIcone('apagar',15)}</button>
    </div>`;
  };

  const corpo=`
    <div class="rf-sc">
      ${(carregando||n)?`<div class="rf-sc-hd">
        <span class="rf-label-t">${carregando?'Os seus saves':'Os seus saves'}</span>
        <span class="rf-sc-cont">${carregando?'—':`${n} na nuvem`}</span>
      </div>`:''}
      <div class="rf-sc-lista">
        ${carregando?'<span class="rf-note">Carregando os seus jogos salvos</span>'
                    :saves.map(linha).join('')}
        <button type="button" class="rf-sv2 novo" onclick="clSoloNew()">
          <span class="rf-sv2-cr"><span class="rf-sv2-vazio">${rfIcone('mais',16)}</span></span>
          <span class="rf-sv2-id">
            <span class="rf-sv2-n">Começar um jogo novo</span>
            <span class="rf-sv2-s">Uma carreira do zero contra a máquina — você escolhe país, divisão e clube</span>
          </span>
        </button>
      </div>
    </div>`;

  const primeiro=saves[0];
  const nomePrimeiro=primeiro?((primeiro.state&&(primeiro.state.clubName||primeiro.state.club))
    ||primeiro.club||primeiro.name||primeiro.save_name||''):'';
  return rfWiz({ corpo, passo:rfPasso('Save','solo'), trilha:'solo', contexto:'Modo solo',
    titulo: n?'Onde você quer jogar?':'Comece a sua carreira.',
    sub: n?'Toque num save para continuar, ou comece um jogo novo.'
          :'Uma carreira do zero contra a máquina. Você escolhe país, divisão e clube.',
    nota:'Os saves ficam na nuvem — entre de qualquer aparelho com a mesma conta.',
    voltar:'clGoModo()', voltarLabel:'‹ Voltar ao modo',
    cta: nomePrimeiro?('Continuar o '+nomePrimeiro):'Começar do zero',
    ctaCurto: nomePrimeiro?'Continuar':'Começar',
    ctaOn: primeiro
      ? `clLoadSave('${String(primeiro.name||primeiro.save_name||'').replace(/'/g,"\\'")}')`
      : 'clSoloNew()' });
}
/* escudo do clube do save; sem clube identificado, o crachá fica vazio em vez
   de sumir — a linha perderia o alinhamento das colunas */
function rfSaveEscudoHTML(st){
  const url=(typeof clubCrestUrl==='function' && st && (st.clubId||st.club))
    ? clubCrestUrl({id:st.clubId,crest:st.crest,nome:st.clubName}) : '';
  return url?`<img class="rf-sv2-img" src="${escC(url)}" alt="">`
            :`<span class="rf-sv2-vazio">${rfIcone('camisa',16)}</span>`;
}

/* =====================================================================
   BANCADA DE TEMPORADA — "PULAR 30 E TESTAR"
   ---------------------------------------------------------------------
   POR QUE EXISTE. Testar o fim de temporada exigia jogar trinta jornadas à mão, com três pessoas
   ao mesmo tempo. Ninguém faz isso duas vezes — e é justamente o fim da temporada que concentra
   as finais, a virada e os bugs que mais custaram a este projeto.

   O QUE ELA NÃO É. Não é uma simulação de servidor: é o BOTÃO JOGAR a ser apertado, muito
   depressa, por todos os treinadores da sala. Passa pelo mesmo caminho de sempre — escalar,
   entrar em campo, ver a classificação, carimbar o dia — porque um atalho que passa por fora
   testaria um jogo que ninguém joga.

   AS QUATRO ARMADILHAS, aprendidas a caro numa bancada de fora do jogo (scripts/
   teste-temporada-espectador.mjs) e resolvidas aqui:
     1. nunca forçar `CL.screen` — quebra o encadeamento das cerimônias e leva a conclusões falsas;
     2. a partida PAUSA no intervalo e espera um clique (liveContinue);
     3. a cerimônia de sorteio anda por temporizador próprio: clicar por cima atropela-a;
     4. o botão de ação não se acha por TEXTO — o rótulo muda ("Jogar", "Ver o sorteio", "Avançar").

   PARA ONDE VAI. Pára na jornada alvo e devolve a sala às mãos das pessoas, para a virada de
   temporada ser vivida a sério. É esse o pedaço que interessa observar. */
const TESTE_ALVO_PADRAO = 31;

function clTestePular30(){
  const alvo = TESTE_ALVO_PADRAO;
  if((S.round||0) >= alvo){ toastC('A sala já passou da jornada '+alvo+'.'); return; }
  /* NA RESENHA, A SALA INTEIRA ENTRA JUNTA. O dia só vira quando o ÚLTIMO assento carimba: se só
     um cliente entrasse em auto-jogo, a sala pararia à espera dos outros. No SOLO não há a quem
     avisar — e a bancada serve igual, para testar a virada de temporada sem jogar trinta jornadas
     à mão. */
  if(CL.online && typeof NET!=='undefined' && NET.broadcastTeste) NET.broadcastTeste({ alvo });
  clTesteEntrar({ alvo });
}
function clTesteEntrar(p){
  const alvo=(p&&p.alvo)||TESTE_ALVO_PADRAO;
  if(CL._teste && CL._teste.ligado) return;                 // já está a correr
  CL._teste={ ligado:true, alvo, inicio:(S.round||0), t0:Date.now(), ultimoAto:0, passos:[], ultimoPasso:'' };
  CL._testeRitmoAntes=(typeof CL.tempoLabel!=='undefined')?CL.tempoLabel:null;
  CL.tempoLabel='Foguete';                                   // 6ms por minuto de jogo
  CL.tacticChosen=true;                                      // a bancada não pára para escolher tática
  /* RELÓGIO PRÓPRIO NO SOLO. Na Resenha a bancada pega boleia do laço da sala (onlineTimerLoop);
     no solo esse laço não existe, e sem um relógio ela ficaria ligada sem nunca agir. */
  if(!CL.online){
    if(CL._testeTimer) clearInterval(CL._testeTimer);
    CL._testeTimer=setInterval(()=>{ try{ clTesteTick(); }catch(e){ console.warn('bancada:', e&&e.message); } }, 120);
  }
  clTestePainelAbrir();
  cdraw();
}
function clTesteSair(motivo){
  if(!CL._teste) return;
  const T=CL._teste; CL._teste=null;
  if(CL._testeTimer){ clearInterval(CL._testeTimer); CL._testeTimer=null; }
  clTestePainelFechar();
  if(CL._testeRitmoAntes!=null) CL.tempoLabel=CL._testeRitmoAntes;
  const seg=Math.round((Date.now()-T.t0)/1000);
  clCloseOverlay();
  overlayC(dlg('Bancada concluída', `<div class="cl-res">
    <div class="cl-res-verd" style="text-align:left">✓ ${escC(motivo||('A sala chegou à jornada '+(S.round||0)+'.'))}
      <br><br>Foram ${escC(String((S.round||0)-T.inicio))} jornadas em ${escC(String(seg))}s.
      Daqui em diante é no braço: joguem até ao fim e vejam as finais e a virada de temporada.</div>
    <div class="cl-cal-ok">${btn('Continuar','clCloseOverlay()',{icon:'✔',cls:'cl-btn-ok'})}</div>
  </div>`, {w:520, tone:'marca', glyph:'🧪'}));
  cdraw();
}
/* o que o jogador faria agora, feito por ela. Chamado pelo tique da sala (onlineTimerLoop). */
function clTesteTick(){
  const T=CL._teste; if(!T || !T.ligado) return;
  if(typeof S==='undefined' || !S){ return; }
  if((S.round||0) >= T.alvo){ clTesteSair((CL.online?'A sala':'O jogo')+' chegou à jornada '+(S.round||0)+'.'); return; }
  /* teto de segurança: bancada que não avança em 3 minutos desiste e devolve a sala, em vez de
     ficar a carimbar para sempre sem ninguém perceber. */
  if(Date.now()-T.t0 > 180000 && (S.round||0)===T.inicio){ clTesteSair('A bancada não conseguiu avançar — a sala ficou na jornada '+(S.round||0)+'.'); return; }
  if(Date.now()-(T.ultimoAto||0) < 120) return;              // um ato de cada vez
  T.ultimoAto=Date.now();
  clTestePainelAtualizar();

  /* 1) PARTIDA EM CAMPO: deixa correr. Só o intervalo pede um clique — e é preciso cuidado com
     ele. `liveContinue` só volta a armar o relógio no ramo `if(RL.paused)`; chamada quando a pausa
     já tinha sido levantada (o intervalo da Resenha tem contagem própria de 10s), ela cai no outro
     ramo e o relógio fica sem quem o toque. Foi o que congelou a partida no minuto 46 — logo
     depois do intervalo — no harness de dois clientes.
     Por isso: só se clica se estiver MESMO pausado, e há um cão de guarda para o caso de o
     relógio morrer de qualquer maneira. */
  if(CL.live){
    const RL=CL.live;
    /* ===== OS MODAIS DE DENTRO DA PARTIDA =====
       A partida PARA e espera uma decisão: pênalti, lesão, expulsão, e a disputa de pênaltis no
       fim de um mata-mata. O simulador tem de responder a todos — foi o "parou na tela de
       pênaltis" relatado a 18/08. Cada um tem a sua função no jogo, e é ela que se chama: é a
       mesma decisão que o botão tomaria, e não um atalho por fora.
       A escolha é sempre a mais neutra possível — o batedor já pré-selecionado, o substituto que
       o jogo sugere —, porque a bancada existe para atravessar a temporada, não para jogar bem. */
    if(RL.pens && RL.pensPicking && typeof resolveShootoutKick==='function'){
      T.ultimoPasso='disputa de pênaltis'; resolveShootoutKick(CL.penSel); return;
    }
    /* SEMPRE A SAIDA NEUTRA, NUNCA A QUE EXIGE ESCOLHA. `resolveRedConfirm` so age se o jogador
       JA tiver escolhido quem entra E quem sai (CL.redIn/CL.redOut); chamada sem isso, ela
       devolve sem fazer nada — e a bancada ficava a chamá-la para sempre com a partida parada.
       Foi o "ainda para na expulsão e na lesão" relatado a 18/08. As funções de PRAZO
       (resolveRedSkip, resolveInjuryNoSub, resolvePenalty(null)) não dependem de escolha nenhuma:
       são exatamente o que aconteceria se o jogador não tocasse em nada, que é o comportamento
       certo para quem só quer atravessar a temporada. */
    if(RL.penEvent && typeof resolvePenalty==='function'){
      T.ultimoPasso='pênalti'; resolvePenalty(null); return;          // deixa o capitão bater
    }
    if(RL.injEvent && typeof resolveInjuryNoSub==='function'){
      T.ultimoPasso='lesão'; resolveInjuryNoSub(); return;            // segue sem substituir
    }
    if(RL.redEvent){
      T.ultimoPasso='expulsão';
      if(typeof resolveRedSkip==='function') resolveRedSkip();        // segue sem reorganizar
      else if(typeof resolveRedConfirm==='function') resolveRedConfirm();
      return;
    }
    if(RL.paused){ T.ultimoPasso='intervalo'; if(typeof liveContinue==='function') liveContinue(); T.minAnterior=null; T.paradoDesde=0; return; }
    if(RL.done){ T.ultimoPasso='partida terminada'; return; }   // o fluxo normal fecha
    const min=RL.minute||0;
    if(T.minAnterior===min){
      if(!T.paradoDesde) T.paradoDesde=Date.now();
      /* o relógio não anda há 5s: rearma o tique da partida pelo caminho do próprio jogo. */
      if(Date.now()-T.paradoDesde > 5000){
        T.paradoDesde=Date.now();
        /* o relógio não anda há 5s e nenhum modal conhecido está aberto: pode ser um que eu não
           mapeei. Tenta o botão da tela antes de rearmar o relógio — se houver um modal por cima,
           é ele que o fecha, e o passo escrito no painel diz qual foi. */
        const q=clTesteClicar();
        if(q){ T.ultimoPasso='destravou: '+q; return; }
        try{ if(CL._liveTimer) clearTimeout(CL._liveTimer); if(typeof liveTick==='function') CL._liveTimer=setTimeout(liveTick,60); }catch(e){}
      }
    } else { T.minAnterior=min; T.paradoDesde=0; T.ultimoPasso='em campo · minuto '+min; }
    return;
  }
  /* 2) CERIMÓNIA DE SORTEIO: é PRECISO empurrá-la. Eu tinha-a deixado a "andar sozinha" — ela tem
     temporizador próprio (cupDrawTick, 2s por bola) e eu concluíra, numa bancada de fora do jogo,
     que clicar por cima a atropelava. As duas coisas são verdade e a conclusão estava errada:
     clicar POR CIMA atropela, mas bater o TIQUE DELA é o caminho dela mesma, e sem isso a bancada
     fica presa na cerimónia para sempre — foi o "a correr e nada acontece" relatado a 18/08.
     `fast` é o modo que a própria cerimónia já tem para revelar depressa. */
  if(CL.cupDraw){ T.ultimoPasso='sorteio a revelar'; CL.cupDraw.fast=true; if(typeof cupDrawTick==='function') cupDrawTick(); return; }
  if(CL.screen==='cupdraw'){ clTesteClicar(); return; }   // cerimónia sem estado: sai pelo botão
  /* 3) TELA DE RESULTADO/CLASSIFICAÇÃO: fecha pelo botão de verdade, nunca mexendo em CL.screen. */
  if(CL.screen!=='main'){
    /* AS TELAS DE PASSAGEM TEM CADA UMA A SUA FUNCAO DE CONTINUAR. Adivinhar o botao no DOM
       falhava justamente nas classificacoes (a da Libertadores foi a relatada): a tela tem chips
       e abas com as mesmas classes de botao, e `querySelectorAll` devolve por ORDEM DA PAGINA e
       nao por ordem da minha lista — a bancada clicava numa aba e ficava a navegar em circulos.
       Chamar a funcao do jogo e exato; o clique fica para o que nao tem funcao conhecida. */
    const q=clTesteContinuar();
    T.ultimoPasso=q?('seguiu: '+q):('tela '+CL.screen+' sem saída');
    return;
  }
  /* 4) TELA DO CLUBE. Aqui aperta-se Jogar — o mesmo botão da pessoa. MAS o botão TEM DOIS
     ESTADOS: quando eu já disse que estou pronto, ele vira "Pronto" e a ação passa a ser
     CANCELAR (clCancelarPronto). Apertar às cegas fazia a bancada alternar pronto → cancelado →
     pronto para sempre, sem a sala nunca sair da jornada 0. Apanhado no harness de dois clientes
     em vinte segundos — é para isto que a bancada serve.
     Estando pronto, não há nada a fazer: espera-se pelos outros, que é o que a pessoa faria. */
  if(typeof estouPronto==='function' && estouPronto()){ T.ultimoPasso='pronto — à espera dos outros'; return; }
  T.ultimoPasso='apertou Jogar';
  if(typeof rfJogar==='function') rfJogar(); else if(typeof clJogar==='function') clJogar();
}
/* clica a ação da tela, pela CLASSE e não pelo texto (o rótulo muda), e nunca na barra lateral —
   navegar não é jogar. */
/* CLICA O QUE A TELA OFERECE. "Se todos os botões não forem clicados — classificação pós-rodada,
   sorteios, continuar — o jogo não anda": é literalmente assim, e cada tela de passagem tem o seu
   botão. A busca é por CLASSE e nunca por texto (o rótulo muda: "Jogar", "Ver o sorteio",
   "Avançar dia", "Continuar", "Entendi"), e a barra lateral é proibida — navegar não é jogar. */
const TESTE_SELETORES=[
  '.rf-ov-cta',                 // ação principal dos overlays do pacote novo
  '.rf-dlg-foot button',        // rodapé de diálogo
  '.cl-cal-ok button',          // janelas antigas (classificação, resultado de copa)
  '.cl-btn-ok',                 // OK/Continuar das telas clássicas
  '.rf-btn-primary',            // ação principal de uma página
  '.rf-btn'                     // último recurso: qualquer botão do pacote
];
/* A SAIDA DE CADA TELA DE PASSAGEM, pela funcao do proprio jogo. E o caminho exato: e a mesma
   coisa que o botao faz, sem depender de o encontrar no meio da pagina. */
function clTesteContinuar(){
  const tela=CL.screen;
  try{
    if((tela==='cupclassif') && typeof cupClassifContinue==='function'){ cupClassifContinue(); return 'classificação de copa'; }
    if((tela==='classif'||tela==='seatclassif') && typeof clClassifContinue==='function'){ clClassifContinue(); return 'classificação'; }
    if(tela==='cupview' && typeof clCupViewBack==='function'){ clCupViewBack(); return 'chave da copa'; }
    /* a tela de quem se classificou / como ficaram os grupos e uma cerimonia de fim de fase: ela
       tem fila propria (_pendingMoments/_pendingDrawShows) e sai pelo mesmo Continuar das outras.
       Se nao houver funcao conhecida, o clique por PRIORIDADE apanha o botao certo. */
    if(tela==='entrega' && typeof clCloseOverlay==='function'){ clCloseOverlay(); return 'entrega'; }
  }catch(e){ console.warn('bancada, saída de '+tela+':', e && e.message); }
  return clTesteClicar();
}
/* CLIQUE POR PRIORIDADE, NAO POR ORDEM DA PAGINA. `querySelectorAll('a, b, c')` devolve os
   elementos na ordem em que aparecem no DOM — nao na ordem em que eu os pedi. Numa tela de
   classificacao, uma aba `.rf-btn` vem antes do `.rf-ov-cta` de Continuar, e a bancada clicava na
   aba: navegava em vez de seguir, e ficava presa. Agora percorre-se seletor a seletor, do mais
   especifico ao mais generico, e o primeiro que existir ganha. */
function clTesteClicar(){
  const vis=(el)=>el && el.offsetParent!==null && !el.disabled;
  const proibido=(el)=>el.closest && el.closest('.rf-sidebar, .rf-nav, .rf-teste-painel');
  for(const sel of TESTE_SELETORES){
    const b=Array.from(document.querySelectorAll(sel)).find(x=>vis(x) && !proibido(x));
    if(b){ b.click(); return (b.textContent||'').trim().slice(0,24)||'clique'; }
  }
  if(typeof clCloseOverlay==='function'){ clCloseOverlay(); return 'fechou overlay'; }
  return false;
}
/* o botão, logo abaixo do JOGAR. Só na Resenha, e some quando a sala já passou do alvo. */
function rfBotaoBancadaHTML(){
  if(typeof S==='undefined' || !S) return '';
  if((S.round||0) >= TESTE_ALVO_PADRAO) return '';       // vale nos dois modos: solo e Resenha
  const a=CL._teste && CL._teste.ligado;
  return `<button type="button" class="rf-btn rf-btn-secondary rf-btn-full rf-teste-btn"
    ${a?'disabled':''} title="Joga sozinho até à jornada ${TESTE_ALVO_PADRAO} e devolve a sala"
    onclick="clTestePular30()">${a?'🧪 A correr…':'🧪 PULAR 30 E TESTAR'}</button>`;
}

/* ===== O PAINEL DA BANCADA =====
   A tela fica em blur e só ele aparece à frente: o jogo está a andar por trás, e sem isto o
   jogador vê telas a piscar e clica por cima do que a bancada está a fazer. Mostra a jornada, o
   que ela acabou de tocar e há quanto tempo — para uma bancada parada se ver de imediato, em vez
   de parecer que "não acontece nada". */
function clTestePainelAbrir(){
  clTestePainelFechar();
  const d=document.createElement('div');
  d.id='rf-teste-painel'; d.className='rf-teste-painel';
  d.innerHTML=`<div class="rf-teste-cx">
    <div class="rf-teste-tt">🧪 Simulador Teste</div>
    <div class="rf-teste-sub" id="rf-teste-sub">a preparar…</div>
    <div class="rf-teste-barra"><i id="rf-teste-bar"></i></div>
    <div class="rf-teste-passo" id="rf-teste-passo">—</div>
    <button type="button" class="rf-btn rf-btn-secondary rf-teste-parar"
      onclick="clTesteSair('Bancada interrompida por você.')">Parar</button>
  </div>`;
  document.body.appendChild(d);
  document.body.classList.add('rf-teste-on');
  clTestePainelAtualizar();
}
function clTestePainelFechar(){
  const d=document.getElementById('rf-teste-painel'); if(d) d.remove();
  document.body.classList.remove('rf-teste-on');
}
function clTestePainelAtualizar(){
  const T=CL._teste; if(!T) return;
  const sub=document.getElementById('rf-teste-sub'); if(!sub) return;
  const feitas=Math.max(0,(S.round||0)-T.inicio), faltam=Math.max(0,T.alvo-(S.round||0));
  const total=Math.max(1,T.alvo-T.inicio);
  sub.textContent='Jornada '+(S.round||0)+' de '+T.alvo+' · faltam '+faltam;
  const bar=document.getElementById('rf-teste-bar');
  if(bar) bar.style.width=Math.round(feitas/total*100)+'%';
  const p=document.getElementById('rf-teste-passo');
  if(p) p.textContent=T.ultimoPasso||('tela: '+CL.screen);
}
