#!/usr/bin/env node
/* ============================================================================
   Recorta o fundo das fotos de estádio e gera os .webp que o jogo usa
   (public/img/estadios/brasil-<div>/), a partir das .webp em Estadios/Brasil/.

   POR QUE existe: as fotos das Séries B/C vieram com o fundo CHAPADO (o canal
   alfa existe, mas está todo opaco), enquanto as da Série D, já publicadas, vêm
   recortadas. Como .cl-est-photo/.cl-welc-stadium desenham a imagem direto sobre
   o verde — sem moldura, com drop-shadow seguindo o contorno (ver styles em
   main.css) — o fundo aparecia como uma caixa branca e destoava das outras.

   COMO recorta: descobre a cor de fundo pela COR DOMINANTE DA BORDA (nem sempre é
   branco — a do Goiás, por exemplo, é cinza 218) e faz preenchimento a partir das
   bordas (scipy.ndimage.label), removendo só as regiões dessa cor conectadas à
   moldura da imagem. Um "toda cor X vira transparente" comeria as linhas do campo,
   as coberturas e as marcações internas do estádio — por isso a restrição de
   conectividade com a borda.

   Rode quando chegarem fotos novas (é idempotente):
     node scripts/build-stadium-cutouts.mjs
   ============================================================================ */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC_ROOT = join(ROOT, 'Estadios/Brasil');
const OUT_ROOT = join(ROOT, 'public/img/estadios');

// divisão do jogo -> pasta de origem + pasta de destino.
// Origem = as .webp do acervo (não as .png): é o formato que o acervo trata como final, e o
// jogo serve .webp de qualquer jeito. As .webp vêm com o fundo CHAPADO (alfa todo opaco), então
// o recorte abaixo é o que dá a transparência — não dá pra só copiar.
const DIVS = [
  { div: 'B', src: '2 Divisao/webP', out: 'brasil-b' },
  { div: 'C', src: '3 Divisao/webP', out: 'brasil-c' },
];

const TOL = 12;        // "quase branco": >= 255-TOL nos três canais (JPEG/resize deixam 254, 253...)
const QUALITY = 82;    // faixa dos .webp da Série D já publicados (~326KB/img). Acima disso o recorte
                       // (que reencoda um .webp já comprimido) inflava pra ~540KB sem ganho visível.

/* O recorte em si roda em Python (numpy + scipy já disponíveis): em JS puro seria
   um flood fill pixel a pixel sobre 4,3 milhões de pixels por imagem. */
const PY = `
import sys, numpy as np
from PIL import Image
from scipy import ndimage

src, dst, tol = sys.argv[1], sys.argv[2], int(sys.argv[3])
im = Image.open(src).convert('RGBA')
a = np.array(im)
rgb = a[:,:,:3].astype(np.int16)

# cor de fundo = a MAIS COMUM na moldura da imagem (branco na maioria, cinza no Goiás...)
moldura = np.concatenate([rgb[0,:], rgb[-1,:], rgb[:,0], rgb[:,-1]])
cores, contagem = np.unique(moldura.reshape(-1,3), axis=0, return_counts=True)
bg = cores[contagem.argmax()]
# Uniformidade medida POR TOLERÂNCIA, não por cor exata: compressão e anti-aliasing fazem a
# moldura variar entre 253 e 255, então exigir o valor exato reprovava fundos claramente chapados.
uniforme = (np.abs(moldura - bg) <= tol).all(axis=1).mean()

removidos = 0
if uniforme >= 0.5:
    fundo = (np.abs(rgb - bg) <= tol).all(axis=2)
    lab, n = ndimage.label(fundo)                    # componentes conexos da cor de fundo
    if n:
        borda = set(np.unique(np.concatenate([lab[0,:], lab[-1,:], lab[:,0], lab[:,-1]])))
        borda.discard(0)
        if borda:
            a[np.isin(lab, list(borda)), 3] = 0      # só o fundo que TOCA a borda vira transparente
            removidos = int((a[:,:,3] == 0).sum())
Image.fromarray(a).save(dst)
print(removidos, a.shape[0]*a.shape[1], int(bg[0]), int(bg[1]), int(bg[2]))
`;

let total = 0, falhas = [];
for (const { div, src, out } of DIVS) {
  const srcDir = join(SRC_ROOT, src), outDir = join(OUT_ROOT, out);
  if (!existsSync(srcDir)) { falhas.push(`pasta ausente: ${srcDir}`); continue; }
  mkdirSync(outDir, { recursive: true });
  const files = readdirSync(srcDir).filter(f => /\.(webp|png|jpe?g)$/i.test(f));
  console.log(`Série ${div}: ${files.length} imagens em ${src}`);
  for (const f of files) {
    const base = f.replace(/\.(webp|png|jpe?g)$/i, '');
    const tmp = join('/tmp', `cutout-${base}.png`);
    try {
      const stats = execFileSync('python3', ['-c', PY, join(srcDir, f), tmp, String(TOL)], { encoding: 'utf8' }).trim().split(' ');
      const pct = Math.round(100 * Number(stats[0]) / Number(stats[1]));
      const bg = `rgb(${stats[2]},${stats[3]},${stats[4]})`;
      execFileSync('cwebp', ['-quiet', '-q', String(QUALITY), '-alpha_q', '100', tmp, '-o', join(outDir, base + '.webp')]);
      unlinkSync(tmp);
      console.log(`  ${pct > 0 ? '✓' : '·'} ${base}  (${pct}% removido, fundo ${bg})`);
      if (pct === 0) falhas.push(`${div}/${f}: nada removido — fundo ${bg} não é chapado?`);
      total++;
    } catch (e) {
      falhas.push(`${div}/${f}: ${String(e.message).slice(0, 120)}`);
    }
  }
}
console.log(`\n✅ ${total} imagens recortadas`);
if (falhas.length) { console.log(`⚠ ${falhas.length} falha(s):`); falhas.forEach(x => console.log('  - ' + x)); }
