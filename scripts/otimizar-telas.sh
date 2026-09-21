#!/bin/sh
# CATALOGO -> as imagens que as PAGINAS DO RODAPE usam (/img/telas/*.webp).
#
# POR QUE ISTO EXISTE: as figuras das dez paginas de SEO apontam para /img/telas/, e essa
# pasta tinha SEIS ficheiros de 10/08 -- de antes do rebranding que subiu a 20/08. Quem
# chegava por busca via um jogo com outra cara. Aqui o catalogo (screenshots-catalogo/,
# gerado por scripts/capture-catalogo.mjs) vira a pasta que as paginas leem, com o nome
# curto que as figuras citam.
#
# Uso:  node scripts/capture-catalogo.mjs   &&   sh scripts/otimizar-telas.sh
#
# Os nomes a esquerda sao os que seo/pages.mjs escreve em fig('<nome>', ...). Mudar um nome
# aqui obriga a mudar la -- e o gerador apaga em silencio toda figura cujo ficheiro nao
# exista, entao o erro nao aparece no build: aparece como pagina sem imagem nenhuma.
set -e
R="$(cd "$(dirname "$0")/.." && pwd)"
C="$R/screenshots-catalogo"
D="$R/public/img/telas"
T=$(mktemp -d)
mkdir -p "$D"

conv(){ # conv <nome-curto> <ficheiro no catalogo>
  src="$C/$2"
  if [ ! -e "$src" ]; then echo "  ✗ falta $2"; return; fi
  w=$(sips -g pixelWidth "$src" | awk '/pixelWidth/{print $2}')
  if [ "$w" -gt 1600 ]; then sips --resampleWidth 1600 "$src" --out "$T/$1.png" >/dev/null; src="$T/$1.png"; fi
  cwebp -q 80 -quiet "$src" -o "$D/$1.webp"
  echo "  $1.webp"
}

# --- os seis nomes ANTIGOS, que as paginas ja citam (nao mudar sem mudar seo/pages.mjs) ---
conv hub            "01 - Formação.png"
conv formacao       "01 - Formação.png"
conv classificacao  "14 - Campeonatos - Classificação.png"
conv leilao         "04 - Mercado - Leilão.png"
conv copa           "12 - Campeonatos - Minhas competições.png"

# --- o resto do jogo, que as paginas ainda nao tinham como mostrar ---
conv mercado        "02 - Mercado - Comprar.png"
conv elenco         "08 - Elenco & Base - Elenco.png"
conv ficha-jogador  "09 - Elenco & Base - Ficha do jogador.png"
conv base           "10 - Elenco & Base - Base.png"
conv treino         "11 - Elenco & Base - Treino especial.png"
conv calendario     "13 - Campeonatos - Calendário.png"
conv artilharia     "15 - Campeonatos - Artilharia.png"
conv carreira       "17 - Treinador - Carreira.png"
conv trofeus        "19 - Treinador - Sala de Troféus.png"
conv ranking        "20 - Treinador - Ranking.png"
conv financas       "24 - Finanças - Resumo.png"
conv estadio        "26 - Finanças - Estádio.png"
conv patrocinio     "27 - Finanças - Patrocínio.png"
conv email          "28 - E-mail - Caixa de entrada.png"
conv penalti        "39 - Partida - Penalti (gol).png"
conv substituicao   "43 - Partida - Intervalo (substituicao).png"
conv disputa-penaltis "45 - Partida - Disputa de penaltis.png"
conv pos-rodada     "42 - Pos-rodada - Classificacao das divisoes.png"
conv resenha-criar  "47 - Resenha - criar sala.png"
conv resenha-entrar "48 - Resenha - entrar por codigo.png"

# PARTIDA AO VIVO vem da pasta da home, nao do catalogo: a transmissao e' uma tela que se
# fotografa NO MINUTO CERTO (com o placar ja' andado), e quem sabe fazer isso e' o
# capture-home.mjs -- ele espera o minuto 40 antes de disparar. O catalogo nao a tem.
if [ -e "$R/public/img/home/rodada-ao-vivo.webp" ]; then
  cp "$R/public/img/home/rodada-ao-vivo.webp" "$D/partida.webp"; echo "  partida.webp (da home)"
fi
if [ -e "$R/public/img/home/camarote.webp" ]; then
  cp "$R/public/img/home/camarote.webp" "$D/camarote.webp"; echo "  camarote.webp (da home)"
fi
if [ -e "$R/public/img/home/chat-resenha.webp" ]; then
  cp "$R/public/img/home/chat-resenha.webp" "$D/chat-resenha.webp"; echo "  chat-resenha.webp (da home)"
fi
if [ -e "$R/public/img/home/sala-resenha.webp" ]; then
  cp "$R/public/img/home/sala-resenha.webp" "$D/sala-resenha.webp"; echo "  sala-resenha.webp (da home)"
fi

rm -rf "$T"
echo "pronto → $D"
