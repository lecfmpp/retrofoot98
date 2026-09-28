# Rastreamento de origem dos cadastros

Como o RetroFoot descobre de onde veio cada conta, e o que colocar nos links para que o painel
(Usuários → coluna Origem, faixa "Cadastros por canal") separe **anúncio pago** de **post orgânico**.

## Como funciona

1. `public/src/net/origem.js` roda no jogo e nas páginas do site e guarda no navegador o **primeiro**
   toque e o **último** com sinal (UTM, ids de anúncio, gclid/fbclid, referrer de outro site).
2. No cadastro isso vai para os metadados da conta (`raw_user_meta_data.origem`).
3. `admin_rf98.origem_canal()` (scripts/sql/origem_canal_meta.sql) classifica em canal. A regra vale
   também para contas antigas: o canal é calculado na leitura.

## Por que o fbclid não basta

O Facebook e o Instagram acrescentam `fbclid` a **qualquer** clique que sai deles — anúncio, post, bio,
story. Sozinho ele não prova anúncio, e o painel o conta como **"Instagram/Facebook orgânico"**.
O que prova anúncio é o que o próprio anúncio carrega na URL.

## Anúncios (Gerenciador de Anúncios da Meta)

Em cada anúncio → **Destino** → **Parâmetros de URL** → cole exatamente:

```
utm_source={{site_source_name}}&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{placement}}&campaign_id={{campaign.id}}&adset_id={{adset.id}}&ad_id={{ad.id}}
```

- `{{site_source_name}}` vira `ig`, `fb`, `msg` ou `an` — é o que separa **Meta Ads — Instagram** de
  **Meta Ads — Facebook**.
- `{{placement}}` (ex.: `Instagram_Reels`, `Facebook_Mobile_Feed`) desempata quando a rede não vem.
- Os ids deixam cruzar a conta com a campanha/anúncio exatos no Gerenciador.

Resultado no painel: **Meta Ads — Instagram**, **Meta Ads — Facebook** ou, se só vierem os ids,
**Meta Ads — rede não informada**.

## Conteúdo orgânico

| Onde | Link |
|---|---|
| Bio do Instagram | `https://retrofoot.com.br/?utm_source=instagram&utm_medium=bio&utm_campaign=perfil` |
| Stories | `https://retrofoot.com.br/?utm_source=instagram&utm_medium=stories&utm_campaign=nome-do-story` |
| Post/Reels (link na legenda ou comentário) | `https://retrofoot.com.br/?utm_source=instagram&utm_medium=post&utm_campaign=nome-do-post` |
| Página do Facebook | `https://retrofoot.com.br/?utm_source=facebook&utm_medium=post&utm_campaign=nome-do-post` |

Sem UTM, o clique ainda aparece como **Instagram orgânico** / **Facebook orgânico** quando o navegador
informa o site de origem (l.instagram.com, lm.facebook.com), ou como **Instagram/Facebook orgânico**
quando só vem o fbclid.

**Nunca** use `utm_medium` com `paid`, `cpc`, `cpm` ou `ads` em link orgânico — vira anúncio no painel.
