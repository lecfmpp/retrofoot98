/* =====================================================================
   O MEU JOGADOR NA BASE OFICIAL — plano Embaixador
   ---------------------------------------------------------------------
   O Embaixador poe o nome e a cara dele num jogador de verdade da base: quatro vagas por clube,
   nos 80 clubes das quatro divisoes, nas duas modalidades — 640 no total. Escolhe divisao,
   clube e um dos quatro, escreve o nome e manda a foto. A partir dai a vaga fica PENDENTE ate'
   a moderacao decidir no painel; so' depois de aprovada e' que ela entra na base que todos veem.

   TRES COISAS QUE ESTA TELA NAO DECIDE, e e' de proposito:
     · quem pode      — a RPC `vaga_pedir` confere o plano no servidor. O botao escondido aqui
                        seria so' uma sugestao; a recusa que vale e' a de la'.
     · se esta' livre — idem: entre ver a lista e carregar no botao, alguem pode ter levado a
                        vaga. O erro vem do servidor e a tela recarrega a lista.
     · se e' aprovada — nunca aqui. Nome e foto entram na base de TODOS os treinadores, e por
                        isso passam pela fila do painel (regra do dono, 04/09).

   O QUE ELA PROMETE E' O QUE O JOGO FAZ: o jogador aprovado aparece nos saves NOVOS. Um save em
   curso tem o elenco congelado dentro dele (S.squads), entao nao muda no meio da temporada — e a
   tela diz isso em vez de deixar a pessoa descobrir sozinha.
   ===================================================================== */

const RF_MJ_DIVS = ['A','B','C','D'];
const RF_MJ_NOME_MAX = 18;          /* o mesmo limite da RPC (elifoot_v3.vaga_nome_max) */
const RF_MJ_POS = { GK:'Goleiro', DEF:'Defesa', MID:'Meio', ATT:'Ataque' };

function rfMjEstado(){
  return CL.mj || (CL.mj = { divisao:'A', clubId:null, playerId:null, nome:'', foto:null,
                             clubes:[], vagas:[], carregando:false, minha:null, erro:null });
}
/* a modalidade da vaga e' a do save que se esta' a jogar — o jogador do universo feminino e
   outra vaga, com outro dono possivel (ver a chave da tabela: modalidade+clube+jogador) */
function rfMjModalidade(){
  return (typeof CL!=='undefined' && CL.modalidade==='fem') ? 'fem' : 'mas';
}
function rfMjEhEmbaixador(){
  const st=(typeof NET!=='undefined'&&NET.authStatus)?NET.authStatus():{};
  return (st.plan||st.plano)==='embaixador';
}

/* ---- carregamentos ---- */
function rfMjCarregarMinha(){
  if(typeof NET==='undefined' || !NET.vagaMinha) return;
  NET.vagaMinha(rfMjModalidade()).then(v=>{ rfMjEstado().minha=v||null; cdraw(); }).catch(()=>{});
}
function rfMjSetDivisao(d){
  const e=rfMjEstado();
  e.divisao=d; e.clubId=null; e.playerId=null; e.clubes=[]; e.vagas=[]; e.carregando=true; cdraw();
  NET.vagasPorClube(rfMjModalidade(), d).then(cs=>{
    e.clubes=cs; e.carregando=false; cdraw();
  }).catch(()=>{ e.carregando=false; cdraw(); });
}
function rfMjSetClube(id){
  const e=rfMjEstado();
  e.clubId=id||null; e.playerId=null; e.vagas=[]; if(!id){ cdraw(); return; }
  e.carregando=true; cdraw();
  NET.vagasDoClube(rfMjModalidade(), id).then(vs=>{
    e.vagas=vs; e.carregando=false; cdraw();
  }).catch(()=>{ e.carregando=false; cdraw(); });
}
function rfMjSetJogador(pid){ rfMjEstado().playerId=pid; cdraw(); }
function rfMjSetNome(v){ rfMjEstado().nome=String(v||'').slice(0,RF_MJ_NOME_MAX); }

/* ---- a foto ---- */
function rfMjSubirFoto(){
  const e=rfMjEstado();
  const inp=document.createElement('input');
  inp.type='file'; inp.accept='image/jpeg,image/png,image/webp';
  inp.onchange=()=>{
    const f=inp.files&&inp.files[0]; if(!f) return;
    e.enviando=true; e.erro=null; cdraw();
    Promise.resolve(NET.vagaFoto(f)).then(r=>{
      e.enviando=false;
      if(r&&r.error) e.erro=r.error; else if(r&&r.url) e.foto=r.url;
      cdraw();
    }).catch(err=>{ e.enviando=false; e.erro=(err&&err.message)||'Não consegui enviar.'; cdraw(); });
  };
  inp.click();
}
/* O RETRATO POR IA JA' EXISTE, e e' o mesmo do treinador: a mesma funcao, a mesma cota e os
   mesmos termos aceites. Reaproveitar em vez de abrir um segundo caminho de geracao — que teria
   a sua propria cota, o seu proprio custo e a sua propria forma de falhar. */
function rfMjUsarRetrato(){
  const e=rfMjEstado();
  if(CL.coachFoto){ e.foto=CL.coachFoto; e.erro=null; cdraw(); return; }
  if(typeof rfAvatarIA==='function') rfAvatarIA();
  else if(typeof toastC==='function') toastC('O gerador de retrato não carregou nesta aba.','warn');
}

/* ---- enviar ---- */
function rfMjEnviar(){
  const e=rfMjEstado();
  if(!e.clubId||!e.playerId){ e.erro='Escolha o clube e o jogador.'; cdraw(); return; }
  if((e.nome||'').trim().length<2){ e.erro='Escreva o nome que vai aparecer na ficha.'; cdraw(); return; }
  if(!e.foto){ e.erro='Mande uma foto — é ela que vira o retrato na base.'; cdraw(); return; }
  e.enviando=true; e.erro=null; cdraw();
  NET.vagaPedir(rfMjModalidade(), e.clubId, e.playerId, e.nome.trim(), e.foto).then(r=>{
    e.enviando=false;
    if(r&&r.error){
      e.erro=r.error;
      /* "ja' nao esta' livre" quer dizer que a lista envelheceu: recarrega-a em vez de deixar a
         pessoa a olhar para uma opcao que ja' nao existe */
      if(/livre/i.test(r.error)) rfMjSetClube(e.clubId);
      cdraw(); return;
    }
    e.minha=r.vaga||null; e.erro=null;
    if(typeof toastC==='function') toastC('Pedido enviado. A gente revisa e te avisa.');
    cdraw();
  }).catch(err=>{ e.enviando=false; e.erro=(err&&err.message)||'Não consegui enviar.'; cdraw(); });
}
function rfMjLargar(){
  const e=rfMjEstado();
  if(!confirm('Largar a vaga? O jogador volta ao nome de base e ela fica livre para outro Embaixador.')) return;
  NET.vagaLargar(rfMjModalidade()).then(()=>{ e.minha=null; rfMjSetClube(e.clubId); cdraw(); });
}

/* ---- a tela ---- */
function rfMjCartaoVaga(v, sel){
  const livre = v.status==='livre';
  const pos = RF_MJ_POS[v.posicao]||v.posicao||'';
  const dono = (v.status==='aprovado' && v.nome) ? v.nome
             : (v.status==='pendente' ? 'em análise' : (v.status==='rejeitado' ? 'em análise' : ''));
  return `<button type="button" class="rf-mj-vaga ${sel?'on':''} ${livre?'':'off'}"
      ${livre?`onclick="rfMjSetJogador('${escC(v.player_id)}')"`:'disabled'}>
    <span class="rf-mj-vaga-pos">${escC(pos)}</span>
    <span class="rf-mj-vaga-id">
      <span class="rf-mj-vaga-n">${escC(v.nome_base||'')}</span>
      <span class="rf-mj-vaga-s">${livre?'livre':('ocupada'+(dono?' · '+dono:''))}</span>
    </span>
    <span class="rf-mj-vaga-f">${v.forca!=null?v.forca:'—'}</span>
  </button>`;
}
function rfMjHTML(){
  const e=rfMjEstado();
  const mod=rfMjModalidade();

  if(!rfMjEhEmbaixador()){
    return rfCol(rfCard('O seu jogador na base oficial', `
      <div class="rf-empty">Pôr o seu nome e a sua cara num jogador da base é do plano
        <b>Embaixador</b>. Ele nasce nos elencos, é escalado, leva cartão e faz gol nos jogos
        de todos os outros treinadores.</div>
      <div class="rf-mj-bts"><button type="button" class="rf-ov-cta"
        onclick="rfPlanoCta('embaixador',null,'mes')">Quero ser Embaixador</button></div>`));
  }

  /* JA' TENHO VAGA: a tela deixa de ser um formulario e passa a ser o estado dela */
  if(e.minha){
    const m=e.minha;
    const st={ pendente:['Em análise','A gente revisa o nome e a foto antes de entrarem na base de todo mundo. Você recebe um aviso.'],
               aprovado:['Aprovado','Ele já está na base oficial — aparece nos saves novos, de todos os treinadores.'],
               rejeitado:['Recusado', m.motivo||'Sem motivo registado.'] }[m.status]||['—',''];
    return rfCol(rfCard('O seu jogador na base oficial', `
      <div class="rf-mj-minha">
        <div class="rf-mj-minha-foto">${m.foto_url?`<img src="${escC(m.foto_url)}" alt="">`:'👤'}</div>
        <div class="rf-mj-minha-id">
          <span class="rf-mj-minha-n">${escC(m.nome||m.nome_base||'')}</span>
          <span class="rf-mj-minha-c">${escC(m.clube_nome||'')} · ${escC(RF_MJ_POS[m.posicao]||m.posicao||'')} · força ${m.forca}</span>
          <span class="rf-mj-selo ${escC(m.status)}">${escC(st[0])}</span>
        </div>
      </div>
      <span class="rf-note">${escC(st[1])}</span>
      ${m.status==='rejeitado'?`<span class="rf-note">Largue a vaga para tentar de novo, com outro nome ou outra foto.</span>`:''}
      <span class="rf-note">Ele entra nos saves <b>novos</b>. Um save já em andamento tem o elenco
        congelado dentro dele, então lá o nome antigo continua até a próxima carreira.</span>
      <div class="rf-mj-bts">
        <button type="button" class="rf-ov-b2" onclick="rfMjLargar()">Largar a vaga</button>
      </div>`));
  }

  const clubes=e.clubes||[];
  const vagas=e.vagas||[];
  const sel=vagas.find(v=>v.player_id===e.playerId);
  const pronto = !!(e.clubId && e.playerId && (e.nome||'').trim().length>=2 && e.foto && !e.enviando);

  return rfCol(rfCard('O seu jogador na base oficial', `
    <span class="rf-note">Escolha a divisão, o clube e um dos quatro jogadores disponíveis dele.
      O seu nome e a sua foto entram na ficha — e a partir daí ele joga nos saves de todo mundo,
      no universo <b>${mod==='fem'?'feminino':'masculino'}</b>.</span>

    <div class="rf-mj-passo">
      <span class="rf-label-t">Divisão</span>
      <div class="rf-mj-divs">${RF_MJ_DIVS.map(d=>{
        const rot=(typeof DIV_LABEL_FULL!=='undefined'&&DIV_LABEL_FULL[d])||('Série '+d);
        return `<button type="button" class="rf-mj-div ${e.divisao===d?'on':''}"
          onclick="rfMjSetDivisao('${d}')">${escC(rot)}</button>`;}).join('')}</div>
    </div>

    <div class="rf-mj-passo">
      <span class="rf-label-t">Clube</span>
      ${clubes.length?`<label class="rf-mkf-p rf-mj-sel">
        <span class="rf-mkf-l">Clube</span>
        <span class="rf-mkf-v">${escC((clubes.find(c=>c.club_id===e.clubId)||{}).clube_nome||'escolha um clube')}</span>
        <span class="rf-mkf-c">▾</span>
        <select onchange="rfMjSetClube(this.value)">
          <option value="">escolha um clube</option>
          ${clubes.map(c=>`<option value="${escC(c.club_id)}" ${e.clubId===c.club_id?'selected':''}>
            ${escC(c.clube_nome)} — ${c.livres} de ${c.total} livres</option>`).join('')}
        </select>
      </label>`:`<span class="rf-note">${e.carregando?'A carregar os clubes…':'Escolha uma divisão para ver os clubes.'}</span>`}
    </div>

    ${e.clubId?`<div class="rf-mj-passo">
      <span class="rf-label-t">Qual dos quatro</span>
      ${vagas.length?`<div class="rf-mj-vagas">${vagas.map(v=>rfMjCartaoVaga(v, v.player_id===e.playerId)).join('')}</div>`
        :`<span class="rf-note">${e.carregando?'A carregar…':'Este clube não tem vagas.'}</span>`}
    </div>`:''}

    ${sel?`<div class="rf-mj-passo">
      <span class="rf-label-t">O nome na ficha</span>
      <input class="rf-campo-c" maxlength="${RF_MJ_NOME_MAX}" placeholder="Seu nome"
        value="${escC(e.nome||'')}" oninput="rfMjSetNome(this.value)">
      <span class="rf-note">Até ${RF_MJ_NOME_MAX} caracteres — é o que cabe na ficha, na artilharia
        e na escalação sem cortar.</span>
    </div>

    <div class="rf-mj-passo">
      <span class="rf-label-t">A foto</span>
      <div class="rf-mj-foto-l">
        <div class="rf-mj-foto">${e.foto?`<img src="${escC(e.foto)}" alt="">`:(e.enviando?'⏳':'📷')}</div>
        <div class="rf-mj-foto-b">
          <button type="button" class="rf-ov-b2" onclick="rfMjSubirFoto()">
            ${e.foto?'Trocar a foto':'Subir uma foto'}</button>
          <button type="button" class="rf-ov-b2" onclick="rfMjUsarRetrato()">
            ${CL.coachFoto?'Usar o meu retrato':'Gerar retrato com IA'}</button>
        </div>
      </div>
      <span class="rf-note">Ela vira o retrato dele na base. Passa por revisão antes de entrar —
        é a cara que vai aparecer no jogo dos outros.</span>
    </div>`:''}

    ${e.erro?`<div class="rf-mj-erro">${escC(e.erro)}</div>`:''}

    <div class="rf-mj-bts">
      <button type="button" class="rf-ov-cta" ${pronto?'':'disabled'} onclick="rfMjEnviar()">
        ${e.enviando?'A enviar…':'Enviar para revisão'}</button>
    </div>`));
}
