#!/bin/sh
# PNG -> webp para as imagens da home (ver capture-home.mjs).
# Reduz para 1600px de LARGURA quando for mais largo que isso, e NUNCA aumenta:
# o painel do chat sai recortado em ~1200px e escalar para cima so o embaça.
D="$(cd "$(dirname "$0")/.." && pwd)/public/img/home"
T=$(mktemp -d)
for f in "$D"/*.png; do
  [ -e "$f" ] || continue
  b=$(basename "$f" .png)
  w=$(sips -g pixelWidth "$f" | awk '/pixelWidth/{print $2}')
  if [ "$w" -gt 1600 ]; then
    sips --resampleWidth 1600 "$f" --out "$T/$b.png" >/dev/null
    src="$T/$b.png"
  else
    src="$f"
  fi
  cwebp -q 80 -quiet "$src" -o "$D/$b.webp"
  echo "  $b.webp"
done
rm -rf "$T" "$D"/*.png
