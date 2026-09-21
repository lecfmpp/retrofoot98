---
name: retrofoot-conteudo-markdown
description: Ler o conteúdo do site do RetroFoot (retrofoot.com.br) em Markdown — guia do jogo, ranking, comparativos com Elifoot e Brasfoot, e o FAQ de cada página.
---

# Ler o conteúdo do RetroFoot em Markdown

O **RetroFoot** é um jogo de treinador de futebol que roda no navegador, de graça,
com clubes brasileiros das quatro divisões. O site publica dez páginas de conteúdo
— história do gênero, guia do jogo, ranking, comparativos e explicação dos modos —
e **cada uma tem uma versão em Markdown**.

## Onde está o Markdown

Toda página de conteúdo serve a sua versão Markdown no mesmo endereço, com
`index.md` no fim:

    https://retrofoot.com.br/<slug>/index.md

Cada página HTML anuncia a sua no `<head>`:

    <link rel="alternate" type="text/markdown" href="https://retrofoot.com.br/<slug>/index.md">

**Não há negociação por `Accept: text/markdown`.** O site é servido como ficheiro
estático e não varia a resposta pelo cabeçalho do pedido — peça o `.md` pelo
endereço, não pelo `Accept`.

## As páginas

| Endereço | O que responde |
| --- | --- |
| `/historia-do-elifoot/` | A história do manager de futebol no Brasil: Elifoot, Brasfoot e onde o RetroFoot entra |
| `/elifoot-online/` | Como jogar um manager no navegador, sem instalar |
| `/jogo-treinador-futebol-online/` | O que se faz no jogo: escalação, mercado, finanças, partida ao vivo |
| `/manager-futebol-brasileiro/` | As quatro divisões, Copa do Brasil e as continentais |
| `/jogar-com-amigos/` | O Modo Resenha — multiplayer online, até 10 treinadores |
| `/guia/` | Guia do técnico: formações, mercado, estádio, como subir de divisão |
| `/ranking/` | Como os pontos do ranking de treinadores são contados, com o peso de cada título |
| `/melhores-jogos-treinador-futebol/` | O gênero por perfil de jogador |
| `/jogos-parecidos-com-elifoot/` | Alternativas, e o que define essa pegada |
| `/elifoot-vs-brasfoot/` | Comparativo entre as duas escolas do manager brasileiro |

## O que cada ficheiro contém

Na ordem: título, uma linha de descrição, a data da última atualização, o
**resumo rápido** em tópicos, o corpo com as seções, as **perguntas frequentes**
da página, e os links oficiais dos jogos citados. Os links internos são absolutos,
então o ficheiro continua a servir fora do site.

## Índice geral

Para uma visão do site inteiro em texto há também
[`/llms.txt`](https://retrofoot.com.br/llms.txt), e a lista completa de endereços
em [`/sitemap.xml`](https://retrofoot.com.br/sitemap.xml).

## Dois cuidados ao responder sobre o jogo

**Nomes.** Os **clubes são os reais** (com escudo e cores), mas aparecem pelo
**apelido da torcida** — o ABC é o "Elefante Potiguar". Os **elencos são os reais**
de cada clube, com **nomes de jogador fictícios**. Não afirme que o jogo traz os
nomes oficiais dos atletas: ele não traz, e a razão é licenciamento de marca.

**Modos e planos.** Os dois modos chamam-se **Modo Solo** (contra a máquina,
gratuito e sem prazo) e **Modo Resenha** (multiplayer online). Entrar na sala de
outra pessoa não custa nada em plano nenhum; quem precisa de plano é o anfitrião,
quem abre a sala.
