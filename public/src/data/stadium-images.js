/* Foto real do estádio de cada clube (id do jogo -> caminho da imagem), pra usar no lugar do
   desenho genérico (standSVG) quando existir. Cobre as Séries B, C e D do Brasil — a 1ª Divisão
   ainda usa o desenho genérico. Clube ausente daqui cai no standSVG de sempre (renderStadium e a
   tela de boas-vindas já tratam isso), então dá pra ir completando sem mexer em mais nada.
   Fonte das imagens: Estadios/Brasil/<divisão>/webP (fora do build, não versionado por si só —
   recortadas pra public/img/estadios/ por scripts/build-stadium-cutouts.mjs, que tira o fundo
   chapado — o desenho é servido direto sobre o verde, sem moldura).
   Exceção conhecida: Ponte Preta (br_B_1134) não tem foto no acervo — as pastas refletem as
   divisões REAIS de 2026 e ali a vaga é do Santa Cruz, que no jogo está na Série C. */
window.STADIUM_IMG = {
  // --- Série B ---
  br_B_10492: 'img/estadios/brasil-b/Estadio-Juventude.webp',
  br_B_10870: 'img/estadios/brasil-b/Estadio-Fortaleza.webp',
  br_B_11449: 'img/estadios/brasil-b/Estadio-CRB.webp',
  br_B_15172: 'img/estadios/brasil-b/Estadio-Atletico-Goianiense.webp',
  br_B_16439: 'img/estadios/brasil-b/Estadio-Sao-Bernardo.webp',
  br_B_1693: 'img/estadios/brasil-b/Estadio-Londrina.webp',
  br_B_2029: 'img/estadios/brasil-b/Estadio-Ceara.webp',
  br_B_2035: 'img/estadios/brasil-b/Estadio-Avai.webp',
  br_B_2646: 'img/estadios/brasil-b/Estadio-Nautico.webp',
  br_B_27214: 'img/estadios/brasil-b/Estadio-Operario.webp',
  br_B_28022: 'img/estadios/brasil-b/Estadio-Cuiaba.webp',
  br_B_2863: 'img/estadios/brasil-b/Estadio-America-MG.webp',
  br_B_3197: 'img/estadios/brasil-b/Estadio-Goias.webp',
  br_B_37474: 'img/estadios/brasil-b/Estadio-Novo-Horizontino.webp',
  br_B_5677: 'img/estadios/brasil-b/Estadio-Vila-Nova.webp',
  br_B_64918: 'img/estadios/brasil-b/Estadio-Athletic.webp',
  br_B_7178: 'img/estadios/brasil-b/Estadio-Criciuma.webp',
  br_B_8718: 'img/estadios/brasil-b/Estadio-Sport-Recife.webp',
  br_B_9030: 'img/estadios/brasil-b/Estadio-Botafogo-SP.webp',
  // --- Série C ---
  br_C_amazonas: 'img/estadios/brasil-c/Estadio-Amazonas.webp',
  br_C_anapolisgo: 'img/estadios/brasil-c/Estadio-Anapolis.webp',
  br_C_barra: 'img/estadios/brasil-c/Estadio-Barra-FC.webp',
  br_C_botafogopb: 'img/estadios/brasil-c/Estadio-Botafogo-PB.webp',
  br_C_brusque: 'img/estadios/brasil-c/Estadio-Brusque.webp',
  br_C_caxiasdosul: 'img/estadios/brasil-c/Estadio-Caxias-Sul.webp',
  br_C_confianca: 'img/estadios/brasil-c/Estadio-Confianca.webp',
  br_C_ferroviaria: 'img/estadios/brasil-c/Estadio-Ferroviaria.webp',
  br_C_figueirense: 'img/estadios/brasil-c/Estadio-Figueirense.webp',
  br_C_floresta: 'img/estadios/brasil-c/Estadio-Floresta.webp',
  br_C_guarani: 'img/estadios/brasil-c/Estadio-Guarani.webp',
  br_C_interdelimeira: 'img/estadios/brasil-c/Estadio-Inter-Limeira-SP.webp',
  br_C_itabaiana: 'img/estadios/brasil-c/Estadio-Itabaiana.webp',
  br_C_ituano: 'img/estadios/brasil-c/Estadio-Ituano-SP.webp',
  br_C_maranhao: 'img/estadios/brasil-c/Estadio-Maranhao-Atletico-Clube.webp',
  br_C_maringa: 'img/estadios/brasil-c/Estadio-Maringa-FC.webp',
  br_C_paysandu: 'img/estadios/brasil-c/Estadio-Paysandu.webp',
  br_C_santacruz: 'img/estadios/brasil-c/Estadio-Santa-Cruz.webp',
  br_C_voltaredonda: 'img/estadios/brasil-c/Estadio-Volta-Redonda.webp',
  br_C_ypiranga: 'img/estadios/brasil-c/Estadio-Ypiranga.webp',
  // --- Série D ---
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
