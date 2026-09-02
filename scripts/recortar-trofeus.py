# -*- coding: utf-8 -*-
"""Tira o ciclorama das fotografias de taça, recorta no conteúdo e grava o WebP com alfa
que o jogo usa em public/img/trofeus/.

    python3 scripts/recortar-trofeus.py Liberta-Cup.jpeg=liberta-cup [outra.jpg=nome ...]

O FUNDO NÃO SAI POR LIMIAR, e as duas razões estão medidas:

· UM LIMIAR GLOBAL COME LETRA DE METAL. O "LIGA ACESSO" em prata escovada cai dentro de
  (min>205, sat<30) e, ligado ao pano pelos vãos entre as letras, sai junto — a taça
  chegava escrita "LL A ACE O". Por isso o fundo é medido contra um MODELO do próprio
  ciclorama (a imagem borrada só nos pixels de fundo, normalizada), não contra um número.

· O MODELO PRECISA DE DUAS ESCALAS. Com uma só (sigma 45) o miolo da peça fica sem
  suporte: o peso zera, a divisão explode e o modelo vale ~0 ali. Comparados a esse
  modelo inválido, os vãos do brasão da Liga Soberana e o espaço entre a fita e o tucano
  da Copa da Federação pareciam metal — e vinham preenchidos de BRANCO.

O VÃO FECHADO (o pano visto por dentro da peça) só é procurado onde ele existe. Nas
outras artes todo o pano já encosta na moldura, e procurar vão ali só acha realce de
metal: cada achado desses é um furo no meio da taça. Daí `vao` ser opt-in por arte.

A borda leva o pano desfeito (C = a·F + (1−a)·B). Sem isso a taça ganha um halo claro
em volta assim que é posta sobre o fundo escuro da Sala de Troféus.
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

SAIDA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                     'public', 'img', 'trofeus')
# quais artes têm vão fechado de verdade (o resto: desligado, ver o cabeçalho)
COM_VAO = {'liga-soberana', 'copa-federacao'}


def ligado_a_borda(cand):
    lab, _ = ndimage.label(cand)
    marcas = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
    marcas.discard(0)
    return np.isin(lab, list(marcas))


def recortar(origem, nome, lado=400, q=88, tol=14, tol_vao=6, vao_min=2500,
             textura_max=3.0, sat_max=30, vao=None):
    a = np.asarray(Image.open(origem).convert('RGB')).astype(np.float32)
    mn = a.min(2); sat = a.max(2) - mn; L = a.mean(2)

    grosso = ligado_a_borda((mn > 205) & (sat < sat_max))

    def pano(sigma):
        peso = ndimage.gaussian_filter(grosso.astype(np.float32), sigma)
        cor = np.dstack([ndimage.gaussian_filter(np.where(grosso, a[..., c], 0), sigma)
                         for c in range(3)])
        return cor / np.maximum(peso, 1e-6)[..., None], peso

    perto, p_perto = pano(45.0)
    longe, p_longe = pano(260.0)
    medio = np.median(a[grosso], axis=0) if grosso.any() else np.array([242., 240., 244.])
    modelo = np.where((p_perto > 0.02)[..., None], perto,
              np.where((p_longe > 0.02)[..., None], longe, medio))
    dist = np.abs(a - modelo).max(2)

    externo = ligado_a_borda((dist < tol) & (sat < sat_max + 10))

    vazio = np.zeros_like(externo)
    if vao if vao is not None else (nome in COM_VAO):
        m1 = ndimage.uniform_filter(L, 7); m2 = ndimage.uniform_filter(L * L, 7)
        textura = np.sqrt(np.maximum(m2 - m1 * m1, 0))
        cand = (dist < tol_vao) & (sat < sat_max) & (textura < textura_max) & ~externo
        cand = ndimage.binary_opening(cand, np.ones((5, 5)))
        lab, n = ndimage.label(cand)
        if n:
            area = ndimage.sum(cand, lab, range(1, n + 1))
            vazio = np.isin(lab, [i + 1 for i in range(n) if area[i] >= vao_min])

    frente = ndimage.binary_closing(~externo, np.ones((5, 5)))
    frente = ndimage.binary_fill_holes(frente) & ~vazio   # realce fecha, vão fica
    frente = ndimage.binary_opening(frente, np.ones((3, 3)))
    lab2, n2 = ndimage.label(frente)
    if n2 > 1:                                            # a peça é uma só
        tam = ndimage.sum(frente, lab2, range(1, n2 + 1))
        frente = lab2 == (int(np.argmax(tam)) + 1)

    alfa = ndimage.gaussian_filter(frente.astype(np.float32), 1.2)
    alfa = np.clip((alfa - 0.30) / 0.45, 0, 1)
    aa = alfa[..., None]
    F = np.clip((a - (1 - aa) * modelo) / np.maximum(aa, 0.18), 0, 255)
    cor = np.where(aa > 0.98, a, F)

    out = Image.fromarray(np.dstack([cor, alfa * 255]).astype(np.uint8))
    out = out.crop(out.getchannel('A').point(lambda v: 255 if v > 6 else 0).getbbox())
    w, h = out.size
    f = lado / max(w, h)                                  # lado maior = 400, como as antigas
    out = out.resize((max(1, round(w * f)), max(1, round(h * f))), Image.LANCZOS)
    destino = os.path.join(SAIDA, nome + '.webp')
    out.save(destino, 'WEBP', quality=q, method=6)
    return destino, out.size, os.path.getsize(destino) / 1024


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__); raise SystemExit(1)
    for arg in sys.argv[1:]:
        origem, _, nome = arg.partition('=')
        if not nome:
            nome = os.path.splitext(os.path.basename(origem))[0].lower()
        d, tam, kb = recortar(origem, nome)
        print(f"{nome:18} {tam[0]:3}x{tam[1]:3}  {kb:5.1f} KB  ->  {d}")
