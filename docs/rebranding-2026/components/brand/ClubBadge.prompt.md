Escudo do clube; cai para o badge de iniciais nas cores do time quando não há imagem — o mesmo comportamento do `clubCrestHTML()` do jogo.

```jsx
<ClubBadge initials="XV" crest={club.crest} size={48} ring />
```

Use `ring` no cabeçalho (fundo primário + anel secundário) e sem `ring` dentro de cards escuros, onde o fundo é branco.
