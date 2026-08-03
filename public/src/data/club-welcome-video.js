/* Vídeo do presidente entregando a camisa ao novo treinador, mostrado na tela de boas-vindas
   (ver scBoasVindas em ui/main.js) logo após o sorteio do clube — tanto no Modo Solo quanto no
   Modo Resenha. Mapa id do clube -> vídeo específico; sem entrada, cai no vídeo genérico
   (WELCOME_VIDEO_DEFAULT). Hoje só existe o genérico — dá pra ir plugando vídeos reais por
   clube aqui depois, sem mexer em mais nada. */
window.WELCOME_VIDEO_DEFAULT = 'video/boas-vindas-presidente.mp4';
window.CLUB_WELCOME_VIDEO = {};
function clubWelcomeVideo(clubId){
  return (window.CLUB_WELCOME_VIDEO && window.CLUB_WELCOME_VIDEO[clubId]) || window.WELCOME_VIDEO_DEFAULT;
}
