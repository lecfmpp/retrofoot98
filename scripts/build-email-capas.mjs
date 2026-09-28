/* ===== CAPAS DOS E-MAILS (27/09/2026) =====
   Gera as imagens de cabeçalho padrão dos templates em public/img/email/ (servidas em
   https://retrofoot.com.br/img/email/...). JPG, porque WebP não abre no Outlook e em vários
   clientes de e-mail. Precisa do ffmpeg.

   node scripts/build-email-capas.mjs                → gera as capas padrão (lista CAPAS)
   node scripts/build-email-capas.mjs video <ID> <nome>
        → capa de VÍDEO: miniatura do YouTube com botão de play por cima, em public/img/email/<nome>.jpg.
          E-mail não toca vídeo; o padrão é a miniatura com play levando ao vídeo (HEADER_LINK).

   GIF: não precisa passar por aqui — qualquer .gif público serve direto em HEADER_IMG (Gmail e
   Apple Mail animam; o Outlook do Windows mostra só o 1º quadro, então o 1º quadro tem de se explicar). */
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const OUT = 'public/img/email';
mkdirSync(OUT, { recursive: true });
const ff = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args]);

/* telas 1600x1000 → 1120x630 (16:9, 2x de 560 de largura), cortando a faixa do ranking do topo */
const tela = (src, nome) => ff(['-i', src, '-vf', 'scale=1120:700,crop=1120:630:0:50', '-q:v', '4', `${OUT}/${nome}.jpg`]);
/* pôsteres 720x406 já são 16:9 */
const poster = (src, nome) => ff(['-i', src, '-vf', 'scale=720:405', '-q:v', '3', `${OUT}/${nome}.jpg`]);

/* botão de play (círculo amarelo da marca + triângulo azul), desenhado pelo próprio ffmpeg */
function play(dest) {
  const R = 64, S = 2 * R;
  const circulo = `lte(hypot(X-${R},Y-${R}),${R - 1})`;
  const triangulo = `gte(X,${R - 18})*lte(abs(Y-${R}),(${R + 30}-X)*26/48)`;
  ff(['-f', 'lavfi', '-i', `color=c=black:s=${S}x${S},format=rgba`, '-frames:v', '1', '-vf',
    `geq=r='if(${triangulo},23,242)':g='if(${triangulo},69,185)':b='if(${triangulo},143,12)':a='if(${circulo},255,0)'`, dest]);
}
function video(id, nome) {
  const tmp = join(tmpdir(), `rf-yt-${id}`);
  mkdirSync(tmp, { recursive: true });
  execFileSync('curl', ['-sfo', join(tmp, 'thumb.jpg'), `https://img.youtube.com/vi/${id}/maxresdefault.jpg`]);
  play(join(tmp, 'play.png'));
  ff(['-i', join(tmp, 'thumb.jpg'), '-i', join(tmp, 'play.png'), '-filter_complex',
    '[0]scale=1120:630[b];[b][1]overlay=(W-w)/2:(H-h)/2', '-q:v', '4', `${OUT}/${nome}.jpg`]);
  rmSync(tmp, { recursive: true, force: true });
}

const [modo, id, nome] = process.argv.slice(2);
if (modo === 'video') {
  if (!id || !nome) { console.error('uso: node scripts/build-email-capas.mjs video <ID_DO_YOUTUBE> <nome>'); process.exit(1); }
  video(id, nome);
  console.log(`${OUT}/${nome}.jpg`);
} else {
  const CAPAS = [
    ['poster', 'public/img/home/posters/convite-assinatura.webp', 'boas-vindas'],
    ['tela', 'public/img/telas/mercado.webp', 'dica-janela'],
    ['tela', 'public/img/telas/financas.webp', 'dica-caixa'],
    ['tela', 'public/img/telas/elenco.webp', 'dica-rodizio'],
    ['tela', 'public/img/telas/treino.webp', 'dica-evolucao'],
    ['tela', 'public/img/telas/copa.webp', 'dica-copa'],
    ['tela', 'public/img/telas/classificacao.webp', 'dica-acesso'],
    ['poster', 'public/img/home/posters/momento-campeao.webp', 'dica-fim-temporada'],
    ['tela', 'public/img/telas/hub.webp', 'novidade'],
    ['tela', 'public/img/telas/estadio.webp', 'time-do-coracao'],
    ['tela', 'public/img/telas/rodada-ao-vivo.webp' , 'sentimos-falta'],
    ['poster', 'public/img/home/posters/convite-jantar.webp', 'pro-travado'],
    ['poster', 'public/img/home/posters/momento-artilheiro.webp', 'pro-extra'],
  ];
  for (const [tipo, src, n] of CAPAS) {
    const origem = existsSync(src) ? src : src.replace('/telas/', '/home/');
    (tipo === 'tela' ? tela : poster)(origem, n);
  }
  video('uHqD6dHBTnI', 'video-como-jogar');
  console.log(`${CAPAS.length + 1} capas em ${OUT}/`);
}
