# O calendário — documento explicativo

`como-funciona-o-calendario.html` abre sozinho no navegador. Explica, sem termos técnicos, como a
temporada é montada, em que ritmo cada competição entra em campo e por que finais de copa
aconteciam sem o jogador ver. Termina com o plano para calendários de outros países.

## De onde saem os números

Todos foram lidos de uma temporada aberta, não estimados. Para refazer a leitura, com o jogo no
ar em `localhost:5199`, no console:

```js
// a folha de datas e quantas rodadas cada copa precisa
const C = WORLD_RULES.calendar();
({ jornadas: C.league.length,
   datas: { copaBrasil: C.copaBrasil.length, libertadores: C.libertadores.length,
            sulamericana: C.sulamericana.length },
   rodadas: { copaBrasil: cupTotalRounds('copaBrasil'),
              libertadores: cupTotalRounds('libertadores'),
              sulamericana: cupTotalRounds('sulamericana') } })

// em que semana cada copa entra em campo, e onde elas se chocam
S.cupCalendar
```

## O que a leitura mostrou (temporada 2026)

| | Valor |
|---|---|
| Semanas na temporada | 38 |
| Semanas com alguma copa | 14 |
| Semanas com mais de uma copa | 10 (três delas com as três) |
| Rodadas marcadas **fora** da temporada | 2 — Libertadores na 40, Sul-Americana na 41 |
| Datas × rodadas, continentais | 10 datas para 11 rodadas |

As duas continentais são as únicas que não fecham a conta, e eram exatamente as duas cujas finais
desapareciam. A temporada hoje se estica para acomodá-las (ver `prorrogarPorCopasPendentes` em
`engine/world-rules.js` e `copasPendentes` em `engine/core.js`), mas **a folha continua
incompleta**: o conserto acontece toda temporada em vez de o dado estar certo desde o começo.
É o passo 1 do plano.
