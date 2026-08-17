# Barra de ação fixa no onboarding mobile

Vale para **todas** as telas de onboarding, nos dois modos: Solo, Resenha, criação de
sala, entrada por código e recuperação de senha. A tela de exemplo em
`Onboarding 1 - Entrar - Mobile.html` já está implementada — use como referência
literal.

## O problema

Hoje cada tela de onboarding mobile é um documento que cresce para baixo. O botão
principal fica no fim do conteúdo, então em telas longas o jogador precisa rolar até
o fim para encontrá-lo — e em telas curtas ele flutua no meio do vazio. Além disso o
conteúdo transborda na horizontal em aparelhos estreitos, criando um scroll lateral
que não deveria existir num aplicativo.

## A regra

**A moldura tem altura fixa. O conteúdo rola dentro dela. A barra de ação nunca
sai da tela.**

Três camadas, nesta ordem:

1. **Moldura** (`[data-phone]`) — altura limitada, `display:flex; flex-direction:column`,
   `overflow:hidden`.
2. **Corpo** (`[data-scroll]`) — `flex:1; min-height:0; overflow-y:auto;
   overflow-x:hidden`. É a única coisa que rola.
3. **Barra** (`[data-actionbar]`) — `position:sticky; bottom:0`, fora do corpo
   rolável, irmã dele.

```html
<div data-phone style="width:390px;max-width:100%;height:min(780px,calc(100vh - 48px));
     box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;
     background:#e8f0e7;border:1px solid #d2e0d0;border-radius:28px">

  <!-- cabeçalho: fixo, fora do rolável -->
  <div>…</div>

  <!-- corpo: a única coisa que rola -->
  <div data-scroll style="flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;
       overscroll-behavior:contain;-webkit-overflow-scrolling:touch;
       padding:14px 16px 16px;display:flex;flex-direction:column;gap:12px;
       box-sizing:border-box">
    …
  </div>

  <!-- barra: sempre visível -->
  <div data-actionbar style="position:sticky;bottom:0;z-index:20;background:#fff;
       border-top:1px solid #dde7db;
       padding:12px 16px calc(16px + env(safe-area-inset-bottom));
       display:grid;grid-template-columns:minmax(0,1fr);gap:8px;
       box-sizing:border-box;box-shadow:0 -8px 20px -14px rgba(20,33,26,.35)">
    <span style="min-width:0;height:48px;…">Criar conta e continuar</span>
  </div>
</div>
```

### Por que `height` na moldura, e não só `sticky`

`position:sticky; bottom:0` só cola dentro de um contêiner com altura definida. Sem a
altura, a moldura cresce com o conteúdo e a barra assenta no fim do documento — que é
exatamente o comportamento que se quer eliminar. Foi o primeiro erro cometido aqui.

No app real, dentro do aparelho, use `height:100dvh` (não `100vh`: o `dvh` acompanha
a barra de endereço do navegador móvel, o `vh` não).

## Um ou dois botões

A barra é sempre **grid**, nunca flex — assim a passagem de um para dois botões é uma
linha só:

```html
<!-- um botão -->
grid-template-columns:minmax(0,1fr)

<!-- dois botões: mesma linha, duas colunas -->
grid-template-columns:minmax(0,1fr) minmax(0,1fr)
```

Com dois botões, **Voltar à esquerda, avançar à direita**, ambos com a mesma altura de
48px e `min-width:0` para não estourarem a coluna:

```html
<div data-actionbar style="…display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px…">
  <span style="min-width:0;height:48px;display:flex;align-items:center;justify-content:center;
        gap:7px;border-radius:14px;border:1px solid #d8e2d6;background:#fff;
        font-size:14px;font-weight:600;color:#5d6c62;white-space:nowrap;cursor:pointer">↩ Voltar</span>
  <span style="min-width:0;height:48px;display:flex;align-items:center;justify-content:center;
        gap:8px;border-radius:14px;background:#F2B90C;border:1px solid #F2B90C;
        font-size:14px;font-weight:700;color:#17458F;white-space:nowrap;cursor:pointer">Continuar</span>
</div>
```

**Nunca empilhe os dois botões em duas linhas** — a barra ficaria com 116px de altura e
comeria a tela. Se um rótulo não couber em metade de 390px, encurte o rótulo, não a
barra: "Voltar", não "Voltar ao passo anterior".

Nas telas sem ação de avançar (a de carregamento, por exemplo) **não existe barra** —
a tela avança sozinha.

## Nada de scroll lateral

Quatro medidas, todas necessárias:

```css
body{margin:0;overflow-x:hidden}
```

- `overflow-x:hidden` também no `[data-scroll]`;
- `max-width:100%` e `box-sizing:border-box` na moldura;
- `min-width:0` em todo filho de flex que contenha texto — sem isso o conteúdo
  estica o pai e cria a barra horizontal;
- nenhuma largura fixa maior que 358px (390 menos os 16px de padding de cada lado)
  dentro do corpo.

## Tela cheia em aparelho estreito

Abaixo de 430px a moldura deixa de ser "telefone numa mesa" e passa a ser a tela:

```css
@media (max-width:430px){
  [data-phone]{
    width:100%!important;
    min-height:100vh; min-height:100dvh;
    border-radius:0!important;
    border-left:none!important; border-right:none!important;
    box-shadow:none!important;
  }
  [data-shell]{padding:0!important}
}
```

## Área segura do aparelho

O padding inferior da barra é `calc(16px + env(safe-area-inset-bottom))`. Em iPhone com
barra de gestos isso evita que o botão fique sob ela. Não substitua por um valor fixo.

## Lista de conferência

Por tela de onboarding mobile:

- [ ] Barra visível **sem rolar**, tanto com conteúdo curto quanto longo
- [ ] Só o corpo rola; cabeçalho e barra ficam parados
- [ ] Nenhum scroll horizontal em 390px **nem em 360px**
- [ ] Dois botões, quando houver, na mesma linha em duas colunas iguais
- [ ] Botões com 48px de altura (alvo de toque mínimo)
- [ ] Último elemento do corpo não fica escondido atrás da barra
- [ ] Em aparelho estreito, a moldura ocupa a tela inteira sem cantos arredondados

## Telas a que se aplica

Onboarding 1 a 7 (Entrar, Modo, País e ligas, Criar sala, Convites, Sorteio do clube,
Boas-vindas), 2b (Solo · como começar), 2c (Resenha · como começar), Abrir sala, Sala
aberta, Entrar com código, Minhas salas, Continuar save, Escolha de moeda, País
jogável, Número de treinadores, Escolha dos clubes, Recuperar senha.

Não é preciso recriar essas telas: aplique as três camadas e a barra em grid a cada
uma, mantendo o conteúdo como está.
