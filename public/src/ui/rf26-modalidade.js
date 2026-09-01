/* ===================================================================
   O PASSO DA MODALIDADE — masculino ou feminino.

   ONDE ELE ENTRA. Entre o nome do save e a escolha do país, porque a modalidade decide QUAIS
   países estão disponíveis: o universo feminino existe só no Brasil por enquanto. Perguntar
   depois do país obrigaria a voltar atrás quando alguém escolhesse a Inglaterra.

   SÓ EXISTE COM A TRAVA LIGADA. `RF_MODALIDADES.fem` desliga o passo inteiro: a régua volta a
   ter seis itens, o `case` fica inalcançável e o fluxo é byte a byte o de hoje.

   A ESCOLHA NÃO É PERSISTIDA AQUI. `CL.modalidade` vive do onboarding até `clEntrar`, e o que
   fica gravado no save é `S.intlUniverse='brasilFem'` — a mesma string que já carregava o país.

   A FICHA VEM DO ACERVO, NÃO DE UMA URL FIXA. Cada card mostra um jogador de verdade, com o
   escudo, a posição e a idade que ele tem no catálogo, e a foto sai de RF_FOTOS — o mesmo
   índice que a tela de elenco usa. Fixar uma URL do Storage aqui deixaria a tela quebrada no
   dia em que aquela foto fosse regerada ou apagada. Sem foto, a moldura fica só com as listras:
   é o estado esperado do lado feminino até o Estúdio IA gerar as primeiras.
   =================================================================== */

/* A trava, num lugar só: quem pergunta "o feminino existe?" pergunta aqui. */
function rfFemLigado(){
  return !!(typeof RF_MODALIDADES!=='undefined' && RF_MODALIDADES && RF_MODALIDADES.fem);
}
function rfModalidadeAtual(){ return (typeof CL!=='undefined' && CL.modalidade) || 'masc'; }

/* ---- O PAR QUE ILUSTRA A ESCOLHA ----
   Um jogador e uma jogadora, os dois da MESMA equipa — a Lusa Carioca, Série D. Ser o mesmo
   clube é o argumento da tela em imagem: mesmo escudo, mesmas cores, mesma camisa, e o que muda
   é quem está dentro dela. Dois clubes diferentes contariam outra história.

   FIXOS POR ID, NUNCA POR NOME. O pacote oficial troca o nome de fábrica pelo fictício — o
   "Uelber" do bundle chega ao jogo com outro nome, e é o fictício que está na chave da foto.
   Resolver pelo `id`, que o pacote não toca, passa por cima disso sem precisar saber dele.
   No feminino o nome vem do mapa de jogadoras, pelo mesmo id: é a regra de femSquad (core.js),
   e é a chave que o Estúdio IA usa ao gravar a foto delas. */
const RF_MOD_CARTAZ = {
  clube: 'br_D_portuguesacarioca',
  masc:  'jm001776',   // centroavante, 27 anos
  fem:   'jm001779'    // centroavante, 23 anos
};
/* O clube sai de BRASIL_LOWER, não de DATA.clubs: neste ponto do assistente o país ainda não
   foi escolhido e DATA.clubs tem só a Série A. BRASIL_LOWER carrega no boot (index.html) e já
   chega com o pacote aplicado (dados.js remenda os nomes nele mesmo), que é justamente o estado
   em que os nomes batem com as chaves de RF_FOTOS. */
function rfClubeDoCartaz(){
  const lower=(typeof window!=='undefined' && window.BRASIL_LOWER) || null;
  const serieD=(lower && Array.isArray(lower.D)) ? lower.D : [];
  return serieD.find(c => String(c.id)===RF_MOD_CARTAZ.clube) || null;
}
/* a ficha a partir de um jogador concreto — o nome depende da modalidade, a foto vem do mesmo
   índice que a tela de elenco usa. */
function rfFichaDe(c, p, modalidade){
  if(!c || !p) return null;
  const mapaFem=(typeof window!=='undefined' && window.JOGADORAS_BR) || {};
  const nome = (modalidade==='fem') ? ((p.id!=null && mapaFem[p.id]) || null) : p.n;
  if(!nome) return null;
  const fotos=(typeof window!=='undefined' && window.RF_FOTOS) || {};
  return { nome, foto: fotos[String(c.id)+'|'+nome] || null, pos:p.s, age:p.age, clube:c };
}
/* Memoizado porque a tela redesenha a cada clique e a busca não precisa repetir. */
let RF_MOD_FICHA={};
function rfFichaModalidade(modalidade){
  if(RF_MOD_FICHA[modalidade]!==undefined) return RF_MOD_FICHA[modalidade];
  let out=null;
  try{
    const cz=rfClubeDoCartaz();
    if(cz){
      const alvo=RF_MOD_CARTAZ[modalidade==='fem'?'fem':'masc'];
      out=rfFichaDe(cz, (cz.squad||[]).find(x=>String(x.id)===alvo), modalidade);
    }
    /* RESERVA — o comportamento anterior, e ele continua valendo por dois motivos: o clube do
       cartaz pode não estar carregado (save internacional, bundle podado) e o jogador fixado
       pode ainda não ter foto. Só substitui o fixado quando encontra alguém COM foto: uma ficha
       do clube certo sem foto é melhor que a de um clube qualquer com foto. */
    if(!out || !out.foto){
      const fotos=(typeof window!=='undefined' && window.RF_FOTOS) || {};
      const mapaFem=(typeof window!=='undefined' && window.JOGADORAS_BR) || {};
      const clubes=(typeof DATA!=='undefined' && (DATA.clubsSerieA||DATA.clubs)) || [];
      for(const c of clubes){
        for(const p of (c.squad||[])){
          const nome = (modalidade==='fem') ? ((p.id!=null && mapaFem[p.id]) || null) : p.n;
          if(!nome) continue;
          const foto = fotos[String(c.id)+'|'+nome] || null;
          if(!foto && !out) out={ nome, foto:null, pos:p.s, age:p.age, clube:c };
          if(foto){ out={ nome, foto, pos:p.s, age:p.age, clube:c }; break; }
        }
        if(out && out.foto) break;
      }
    }
  }catch(e){ out=out||null; }
  /* PRE-CARREGA. `cdraw()` reescreve o innerHTML inteiro a cada clique, entao a <img> e' um
     elemento NOVO toda vez — e sem o arquivo em cache a moldura pisca so'-listras antes da foto
     entrar. Pedir a imagem aqui, uma vez, faz o cache do navegador responder do segundo desenho
     em diante. */
  if(out && out.foto && typeof Image!=='undefined'){ try{ new Image().src=out.foto; }catch(e){} }
  return (RF_MOD_FICHA[modalidade]=out);
}

function rfEscolherModalidade(m){
  CL.modalidade = (m==='fem') ? 'fem' : 'masc';
  /* O universo feminino só tem o Brasil. Trocar de modalidade depois de ter marcado a
     Inglaterra deixaria uma seleção impossível de pé. */
  if(CL.modalidade==='fem'){
    CL.countries = new Set(['Brasil']);
    CL.playCountry = 'Brasil';
  }
  cdraw();
}
function rfModalidadeOk(){ CL.screen='paises'; cdraw(); }

/* ---- a moldura 4:5, no formato da ficha do jogador ---- */
function rfModMolduraHTML(ficha){
  const crest=(ficha && ficha.clube && typeof clubCrestUrl==='function') ? clubCrestUrl(ficha.clube) : null;
  const pos=(ficha && typeof rfPosLabel==='function') ? rfPosLabel(ficha.pos) : (ficha&&ficha.pos)||'';
  const linha=[pos, (ficha&&ficha.age)?ficha.age+' anos':''].filter(Boolean).join(' · ');
  return `<span class="rf-mod-frame">
    <span class="rf-mod-listras"></span>
    ${ficha&&ficha.foto
      /* SEM `lazy`: sao duas imagens, acima da dobra, e a tela e' o passo inteiro. Com lazy elas
         chegavam depois do primeiro desenho e a moldura piscava so'-listras antes da foto. */
      ? `<img class="rf-mod-foto" src="${escC(ficha.foto)}" alt="" decoding="async" fetchpriority="high">`
      : `<span class="rf-mod-vazio">${rfIcone('jogador',54)||'👤'}</span>`}
    <span class="rf-mod-veu"></span>
    <span class="rf-mod-ficha">
      ${crest?`<img class="rf-mod-crest" src="${escC(crest)}" alt="">`:''}
      ${linha?`<span class="rf-mod-pos">${escC(linha)}</span>`:''}
      <span class="rf-mod-nome">${escC((ficha&&ficha.nome)||'')}</span>
    </span>
  </span>`;
}

function rfObModalidade(){
  const m = rfModalidadeAtual();
  const card = (chave, titulo, desc, ctaOff) => {
    const on = m===chave;
    return `<button type="button" class="rf-mod-card ${on?'on':''}" onclick="rfEscolherModalidade('${chave}')">
      ${rfModMolduraHTML(rfFichaModalidade(chave))}
      <span class="rf-mod-txt">
        <span class="rf-mod-t">${titulo}</span>
        <span class="rf-mod-d">${desc}</span>
      </span>
      <span class="rf-mod-sel">${on?'✓ Selecionado':ctaOff}</span>
    </button>`;
  };
  const corpo = `
    <div class="rf-mod-cards">
      ${card('masc','Masculino','Elenco masculino, Série A a D e as copas de sempre.','Escolher masculino')}
      ${card('fem','Feminino','Elenco feminino, com o mesmo calendário de divisões e copas.','Escolher feminino')}
    </div>
    <span class="rf-mod-nota">A escolha vale para esta carreira e não muda depois do sorteio dos clubes.</span>`;

  return rfWiz({passo:rfPasso('Modalidade'), corpo,
    sobre:'Masculino ou feminino', titulo:'Você comanda o time masculino ou o feminino?',
    sub:'Os mesmos clubes, o mesmo calendário e as mesmas competições. Muda quem entra em campo.',
    nota:`Selecionado: ${m==='fem'?'feminino':'masculino'}.`,
    voltar:'clPaisesBack()', voltarLabel:'‹ Voltar ao save',
    cta:'Continuar', ctaOn:'rfModalidadeOk()'});
}
