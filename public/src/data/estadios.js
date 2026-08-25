/* ======================================================================
   NOMES DE ESTADIO — a tabela que faltava
   ----------------------------------------------------------------------
   O save guarda do estadio so a CAPACIDADE e a foto: o nome nao existia em
   lado nenhum, e as telas que falam do estadio (Financas -> Estadio, a
   ficha de boas-vindas) diziam "Casa do Palmeiras". Um nome proprio e
   metade da identidade de um clube.

   A chave e o `short` do clube, que e o que as telas ja usam. Clube que nao
   esteja aqui — os de background, os internacionais, os procedurais — cai no
   "Casa do X" de sempre: e melhor um generico honesto do que um nome
   inventado para um clube real.
   ====================================================================== */
const ESTADIOS = {
  /* Serie A */
  'Flamengo':'Maracanã', 'Fluminense':'Maracanã', 'Vasco':'São Januário',
  'Botafogo':'Nilton Santos', 'Palmeiras':'Allianz Parque', 'Corinthians':'Neo Química Arena',
  'São Paulo':'Morumbis', 'Santos':'Vila Belmiro', 'Bragantino':'Nabi Abi Chedid',
  'Cruzeiro':'Mineirão', 'Atlético-MG':'Arena MRV', 'América (MG)':'Independência',
  'Grêmio':'Arena do Grêmio', 'Internacional':'Beira-Rio', 'Juventude':'Alfredo Jaconi',
  'Athletico-PR':'Ligga Arena', 'Coritiba':'Couto Pereira', 'Paraná':'Vila Capanema',
  'Bahia':'Arena Fonte Nova', 'Vitória':'Barradão', 'Fortaleza':'Castelão',
  'Ceará Sporting':'Castelão', 'Sport Club':'Ilha do Retiro', 'Náutico':'Aflitos',
  'Santa Cruz':'Arruda', 'Goiás':'Serrinha', 'Atlético-GO':'Antônio Accioly',
  'Vila Nova (GO)':'Onésio Brasileiro Alvarenga', 'Cuiabá (MT)':'Arena Pantanal',
  'Chapecoense':'Arena Condá', 'Avaí':'Ressacada', 'Figueirense':'Orlando Scarpelli',
  'Criciúma':'Heriberto Hülse', 'Brusque':'Augusto Bauer', 'Mirassol':'Campos Maia',
  'Novorizontino':'Jorge Ismael de Biasi', 'Ponte Preta':'Moisés Lucarelli',
  'Guarani':'Brinco de Ouro da Princesa', 'Ituano':'Novelli Júnior',
  'Inter Limeira':'Major José Levy Sobrinho', 'Ferroviária':'Fonte Luminosa',
  'São Bernardo':'1º de Maio', 'Portuguesa':'Canindé', 'Água Santa':'Distrital do Inamar',
  'Botafogo-SP':'Santa Cruz', 'Operário':'Germano Krüger', 'Londrina (PR)':'Café',
  'Maringá':'Willie Davids', 'Paysandu':'Curuzu', 'Remo':'Baenão',
  'Amazonas':'Carlos Zamith', 'Manaus':'Ismael Benigno',
  'CRB':'Rei Pelé', 'CSA':'Rei Pelé', 'Confiança':'Batistão', 'Itabaiana':'Mendonção',
  'Sergipe':'Batistão', 'Botafogo-PB':'Almeidão', 'Treze':'Amigão',
  'Campinense':'Amigão', 'Sampaio Corrêa':'Castelão', 'Maranhão':'Nhozinho Santos',
  'Floresta':'Domingão', 'Ferroviário':'Elzir Cabral', 'Juazeirense':'Adauto Moraes',
  'Jacuipense':'Vale do Cana', 'Caxias Sul':'Centenário', 'Ypiranga':'Colosso da Lagoa',
  'São José':'Passo D\'Areia', 'Brasil de Pelotas':'Bento Freitas',
  'Volta Redonda':'Raulino de Oliveira', 'Portuguesa-RJ':'Luso-Brasileiro',
  'Athletic Club':'Joaquim Portugal', 'Tombense':'Antônio Guimarães de Almeida',
  'Villa Nova':'Castor Cifuentes', 'Democrata':'Mamudão',
  'Anápolis GO':'Jonas Duarte', 'Aparecidense':'Aníbal Batista de Toledo',
  'Barra':'Gilson Correia de Araújo', 'Marcílio Dias':'Hercílio Luz',
  'Nova Iguaçu':'Laranjão', 'Boavista':'Elcyr Resende',
  'Academia':'Arena Academia', 'Real Ariquemes':'Portal da Amazônia',
  'Humaitá':'Florestão', 'Rio Branco':'Arena da Floresta',
  'Trem':'Zerão', 'Águia de Marabá':'Zinho Oliveira',
  'Altos':'Albertão', 'Fluminense-PI':'Albertão', 'Iguatu':'Morenão',
};
/* o nome que a tela mostra: o proprio, ou o generico honesto */
function estadioNomeDe(club){
  if(!club) return 'Estádio';
  const n=ESTADIOS[club.short] || ESTADIOS[club.name];
  return n || ('Casa do '+(club.short||club.name||'clube'));
}
