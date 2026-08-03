/* Foto real do estádio de cada clube (id do jogo -> caminho da imagem), pra usar no lugar do
   desenho genérico (standSVG) quando existir. Começando só pela Série D do Brasil — as pastas
   de 1ª/2ª/3ª divisão em Estadios/Brasil/ ainda não têm o set completo; dá pra estender esta
   tabela depois sem mexer em mais nada (renderStadium já cai no SVG genérico pra quem não está
   aqui). Fonte das imagens: Estadios/Brasil/<divisão>/ (fora do build, não versionado por si só —
   as usadas aqui foram copiadas pra public/img/estadios/). */
window.STADIUM_IMG = {
  br_D_abc: 'img/estadios/brasil-d/Estadio-ABC.webp',
  br_D_aguiademaraba: 'img/estadios/brasil-d/Estadio-Aguia-Maraba.webp',
  br_D_americarn: 'img/estadios/brasil-d/Estadio-America-RN.webp',
  br_D_asa: 'img/estadios/brasil-d/Estadio-ASA-Arapiraca.webp',
  br_D_capital: 'img/estadios/brasil-d/Estadio-Capital.webp',
  br_D_cianorte: 'img/estadios/brasil-d/Estadio-Cianorte.webp',
  br_D_crac: 'img/estadios/brasil-d/Estadio-CRAC.webp',
  br_D_csa: 'img/estadios/brasil-d/Estadio-CSA.webp',
  br_D_ferroviario: 'img/estadios/brasil-d/Estadio-Ferroviario.webp',
  br_D_gama: 'img/estadios/brasil-d/Estadio-GAMA.webp',
  br_D_luverdense: 'img/estadios/brasil-d/Estadio-Luverdense.webp',
  br_D_marciliodias: 'img/estadios/brasil-d/Estadio-Marcilio-Dias.webp',
  br_D_nacional: 'img/estadios/brasil-d/Estadio-Nacional.webp',
  br_D_portuguesacarioca: 'img/estadios/brasil-d/Estadio-Portuguesa-RJ.webp',
  br_D_portuguesadedesportos: 'img/estadios/brasil-d/Estadio-Portuguesa-SP.webp',
  br_D_saojose: 'img/estadios/brasil-d/Estadio-Sao-Jose.webp',
  br_D_treze: 'img/estadios/brasil-d/Estadio-Treze.webp',
  br_D_uberlandia: 'img/estadios/brasil-d/Estadio-Uberlandia.webp',
  br_D_veloclube: 'img/estadios/brasil-d/Estadio-Velo.webp',
  br_D_xvdepiracicaba: 'img/estadios/brasil-d/Estadio-XV-Piracicaba.webp',
};
