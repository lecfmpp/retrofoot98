import { defineConfig } from 'vite';
import { cpSync } from 'node:fs';
import { resolve } from 'node:path';

// Marco 1 da reestruturação (ver relatorios/ e o plano de arquitetura): só bootstrap
// de build, ZERO mudança de comportamento. public/index.html continua sendo a fonte
// da verdade por enquanto — os próximos marcos vão extrair CSS/dados/motor pra
// módulos de verdade dentro de src/, importados a partir daqui.
//
// root='public': index.html já mora lá, sem precisar mover nada neste marco.
// publicDir=false: desliga o mecanismo padrão do Vite pra pasta de assets estáticos
// (que exigiria uma subpasta "public" DENTRO de public/, o que não existe) — em vez
// disso, img/ e audio/ são copiados manualmente pro build (ver plugin abaixo), porque
// a maioria das referências a eles é gerada em runtime dentro de strings JS
// (`<img src="img/logo.webp">` montado via template literal), não HTML estático que
// o Vite consiga analisar e reescrever sozinho.
//
// src/data/*.js (marco 3): são <script src="..."> CLÁSSICOS, de propósito — ainda não
// viram type="module" porque os blocos de motor/UI (marco 5+) continuam scripts
// clássicos síncronos por enquanto, e um <script type="module"> executa ADIADO (depois
// dos clássicos), quebrando a ordem (o motor lê window.GAME_DATA de imediato ao
// carregar). Vite não empacota <script src> sem type="module" (só ignora, sem copiar o
// arquivo) — por isso entram no mesmo plugin de cópia verbatim que img/audio já usam.
export default defineConfig({
  root: 'public',
  publicDir: false,
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  plugins: [
    {
      name: 'copy-static-assets',
      closeBundle() {
        cpSync(resolve(__dirname, 'public/img'), resolve(__dirname, 'dist/img'), { recursive: true });
        cpSync(resolve(__dirname, 'public/audio'), resolve(__dirname, 'dist/audio'), { recursive: true });
        cpSync(resolve(__dirname, 'public/src'), resolve(__dirname, 'dist/src'), { recursive: true });
        // SEO / descoberta por IA: arquivos estáticos servidos na raiz (publicDir=false não os copia sozinho)
        for(const f of ['robots.txt', 'sitemap.xml', 'llms.txt']){
          cpSync(resolve(__dirname, 'public/'+f), resolve(__dirname, 'dist/'+f));
        }
      },
    },
  ],
});
