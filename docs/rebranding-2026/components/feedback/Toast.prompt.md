Aviso passageiro — o `toastC()` do jogo. Some sozinho; nunca pede clique.

```jsx
<ToastStack>
  <Toast tone="success">Jogo gravado na nuvem.</Toast>
  <Toast tone="warn">Caixa insuficiente para renovar este contrato.</Toast>
  <Toast tone="info" glyph="🔨" action="Ver">Kaique arrematado por 120 mil.</Toast>
</ToastStack>
```

Regras: uma frase, voz do jogo (imperativo ou factual), sem ponto final em confirmação curta com "!". Reticências para processo ("Conectando…"). Nunca use toast para decisão — decisão é `Dialog`.
