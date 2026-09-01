/* ===================================================================
   O PASSO DA MODALIDADE — masculino ou feminino.

   ONDE ELE ENTRA. Entre o nome do save e a escolha do país, porque a modalidade decide QUAIS
   países estão disponíveis: o universo feminino existe só no Brasil por enquanto. Perguntar
   depois do país obrigaria a voltar atrás quando alguém escolhesse a Inglaterra.

   SÓ EXISTE COM A TRAVA LIGADA. `RF_MODALIDADES.fem` desliga o passo inteiro: a régua volta a
   ter seis itens, o `case` fica inalcançável e o fluxo é byte a byte o de hoje. É o caminho de
   reversão de cinco minutos — uma linha e um deploy, sem git.

   A ESCOLHA NÃO É PERSISTIDA AQUI. `CL.modalidade` vive do onboarding até `clEntrar`, e o que
   fica gravado no save é `S.intlUniverse='brasilFem'` — a mesma string que já carregava o país.
   Um save feminino não precisa de campo novo, e por isso um save antigo não precisa de migração.
   =================================================================== */

/* A trava, num lugar só: quem pergunta "o feminino existe?" pergunta aqui. */
function rfFemLigado(){
  return !!(typeof RF_MODALIDADES!=='undefined' && RF_MODALIDADES && RF_MODALIDADES.fem);
}
function rfModalidadeAtual(){ return (typeof CL!=='undefined' && CL.modalidade) || 'masc'; }

function rfEscolherModalidade(m){
  CL.modalidade = (m==='fem') ? 'fem' : 'masc';
  /* O universo feminino só tem o Brasil. Trocar de modalidade depois de ter marcado a Inglaterra
     deixaria uma seleção impossível de pé — e a tela seguinte mostraria um país sem clubes. */
  if(CL.modalidade==='fem'){
    CL.countries = new Set(['Brasil']);
    CL.playCountry = 'Brasil';
  }
  CL.screen='paises'; cdraw();
}

function rfObModalidade(){
  const m = rfModalidadeAtual();
  const cartao = (chave, titulo, tags, desc, cta) => `
      <div class="rf-modo ${chave==='fem'?'resenha':'solo'} ${m===chave?'rec':''}" onclick="rfEscolherModalidade('${chave}')">
        <div class="rf-modo-veu"></div>
        <div class="rf-modo-txt">
          <span class="rf-modo-tags">${tags.map(t=>`<span class="rf-modo-tag${t.rec?' rec':''}">${t.txt}</span>`).join('')}</span>
          <span class="rf-modo-t">${titulo}</span>
          <span class="rf-modo-d">${desc}</span>
          <button type="button" class="rf-modo-cta" onclick="event.stopPropagation();rfEscolherModalidade('${chave}')">${cta}</button>
        </div>
      </div>`;

  const corpo = `
    <div class="rf-modos">
      ${cartao('masc','Futebol masculino',
        [{txt:'15 países',rec:true},{txt:'Séries A a D'}],
        'O mundo de sempre: Brasileirão da Série D à elite, as ligas da Europa e da América do Sul, Copa do Brasil e Libertadores.',
        rfIcone('jogar',16)+' Jogar o masculino')}
      ${cartao('fem','Futebol feminino',
        [{txt:'Brasil',rec:true},{txt:'Séries A a D'}],
        'Os mesmos clubes, os mesmos escudos e as mesmas competições — com elencos de jogadoras. Começa pelo Brasil; os outros países chegam depois.',
        rfIcone('jogar',16)+' Jogar o feminino')}
    </div>`;

  return rfWiz({passo:rfPasso('Modalidade'), corpo,
    sobre:'Masculino ou feminino', titulo:'Qual futebol você quer treinar?',
    sub:'Os dois têm os mesmos clubes, o mesmo calendário e as mesmas competições. Muda quem entra em campo.',
    voltar:'clPaisesBack()', voltarLabel:'‹ Voltar ao save'});
}
