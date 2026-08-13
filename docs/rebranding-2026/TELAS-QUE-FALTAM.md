# Telas a desenhar — nenhuma pendente

Atualizado em 2026-08-13. As 24 telas da lista anterior chegaram na leva 4 e
estão implementadas. **Não há nada aguardando desenho neste momento.**

## Como ler

| Coluna | O que é |
|---|---|
| **tela** | Arquivo em `telas/` do pacote da leva 4 |
| **função** | Quem monta o HTML hoje |
| **`CL.screen`** | Chave da tela no `switch` do `cdraw()`, `main.js` |

---

## Implementado na leva 4

### Partida

| Tela | função | arquivo |
|---|---|---|
| Modal - Penalti Batedor | `rfPenaltiBatedorHTML()` | `rf26-partida.js` |
| Modal - Penalti Suspense | `rfPenaltiSuspenseHTML()` | `rf26-partida.js` |
| Modal - Penalti Resultado | `rfPenaltiResultadoHTML()` | `rf26-partida.js` |
| Modal - Disputa de Penaltis | `rfDisputaHTML()` | `rf26-partida.js` |
| Modal - Prorrogacao | `rfProrrogacaoHTML()` | `rf26-partida.js` |

### Entre rodadas e competições

| Tela | função | `CL.screen` |
|---|---|---|
| Fim de Temporada | `rfFimTemporadaHTML()` | *(sobreposição)* |
| Competicao - Visao Geral | `rfCompeticaoHTML()` | `cupview` |
| Copa - Classificacao da Fase | `rfCopaFaseHTML()` | `cupclassif` |
| Imprensa | `rfImprensaHTML()` | `imprensa` |
| Adversario - Ver Time | `rfVerTimeHTML()` | `teamview` |

Todas em `rf26-competicao.js`.

### Modo Resenha

| Tela | função | `CL.screen` |
|---|---|---|
| Resenha - Pausa Patrocinada | `rfPausaHTML()` | `waitround` |
| Resenha - A Espera da Rodada | `rfEsperaHTML()` | `waitround` |
| Resenha - Passe o Aparelho | `rfPasseHTML()` | `handoff` |
| Resenha - Entrega do Aparelho | `rfEntregaHTML()` | `entrega` *(novo)* |
| Resenha - Classificacao do Assento | `rfAssentoClassifHTML()` | `seatclassif` |

Todas em `rf26-resenha.js`. As duas primeiras são o mesmo `CL.screen`: a pausa
enquanto corre a janela do patrocinador, a espera quando o que falta são os
outros treinadores.

### Fluxo de entrada

| Tela | função | `CL.screen` |
|---|---|---|
| Fluxo - Escolha de Moeda | `rfMoedaHTML()` | `moeda` |
| Fluxo - Pais Jogavel | `rfPaisHTML()` | `paisJogavel` |
| Fluxo - Carregando | `rfCarregandoHTML()` | `loading` |
| Fluxo - Numero de Treinadores | `rfTreinadoresHTML()` | `jogadores` |
| Fluxo - Escolha dos Clubes | `rfClubesHTML()` | `escolhaclubes` |
| Fluxo - Continuar Save | `rfSavesHTML()` | `modosolo` (`soloStep='cont'`) |
| Conta - Recuperar Senha | `rfRecuperarSenhaHTML()` | `recuperarsenha` *(novo)* |
| Landing - Paginas Institucionais | `rfInstitucionalHTML()` | `abertura` + `CL.landingView` |

Todas em `rf26-fluxo.js`.

---

## Envelopes disponíveis para telas novas

| Envelope | Para quê |
|---|---|
| `rfOverlay()` | sobreposição durante a partida |
| `rfStage()` | página cheia entre partidas |
| `rfWiz()` | passo do assistente — trilha de **6 passos** (`semTrilha:true` para telas fora do fluxo) |
| `rfGate()` | tela cheia de troca de aparelho (fundo verde, cartão de 640px) |
| `dlg()` | popup |

---

## Três telas que o jogo tem e o pacote nunca desenhou

Nenhuma delas bloqueia nada — todas já rodam com o desenho novo por herdarem um
envelope. Ficam registradas caso valha um desenho próprio no futuro:

| Tela | função | Por que ficou sem referência |
|---|---|---|
| **Detalhe de um jogo** | `liveModalHTML()` | sobreposição sobre a Partida ao Vivo |
| **Nova senha** | `rfNovaSenhaHTML()` | a outra ponta de *Conta - Recuperar Senha* |
| **Sorteio do Brasileirão** | `cupDrawScreenHTML()` | decisão de produto: o formato já vem pronto de base |

---

## Ver o jogo rodando

```bash
npm run dev
```

Depois `http://localhost:5199/?rf=hub` (atalho de bancada, só em localhost).
