# Como sai um vídeo do YouTube do RetroFoot (o fluxo, em 6 passos)

Resumo: **os agentes fazem tudo o que é texto, plano e edição; você só grava e aperta "publicar".**
Cada passo vira um card no painel Mission Control. Card com "Você" = é a sua vez.

| # | Passo | Quem faz | Onde | O que você vê no painel |
|---|---|---|---|---|
| 1 | **Pacote**: roteiro, título, capa, descrição, capítulos, lista do que gravar | Estúdio YT (agente) | nuvem, PR no GitHub | card de aprovação → **Sim / Ajustar** |
| 2 | **Gravar**: uma sessão de ~1 h seguindo `v1/gravacao.md` (tela e câmera em arquivos separados) | **Você** | seu computador | card "Gravar o V1" → **Já fiz** + onde salvou |
| 3 | **Plano de cortes**: o agente assiste/transcreve o bruto e diz o que sai (silêncios, retakes) | Estúdio YT | seu computador (ffmpeg/Borumi só rodam lá) | card de aprovação curto |
| 4 | **Edição**: master 16:9 do vídeo longo + o Short "O clube é sorteado" (Cortes) + capa final no Canva com um quadro da gravação | Estúdio YT + Cortes | seu computador + Canva | prévia dos vídeos e da capa → **Sim / Ajustar** |
| 5 | **Publicar**: subir/agendar no YouTube com título, descrição, capítulos e capa do pacote | **Você** (publicar é sempre decisão sua) | YouTube Studio | card "Publicar o V1" com tudo pronto para copiar e colar |
| 6 | **Medir**: 48 h depois, CTR e retenção; se o CTR ficar baixo, troca para o título C + capa "Da Série D ao título" | Lupa (pesquisa) | painel | item no briefing da manhã |

## Por que a edição roda no seu computador
O vídeo bruto tem vários GB e as ferramentas de edição (ffmpeg, Borumi, transcrição) estão instaladas lá.
Na nuvem os agentes só preparam texto e planos. Por isso, depois de gravar, você cola **uma instrução**
no Claude Code do seu computador (o card "Gravar o V1" tem o botão "Copiar instrução") e a edição acontece ali.

## O que já está decidido para o V1 (01/10)
- **Título A:** "Manager de futebol online: o jogo me deu um time da Série D".
- **Capa:** modelo "EP. 01 · Você jogava isso na escola" do Canva; troca só a tela da direita pelo clube sorteado.
- **Sem preço no vídeo** (só "Pro" e o link) e **sem citar "Elifoot"** no título, nas tags ou na arte.

## Cada vídeo seguinte (V2 a V8)
Mesmo fluxo. O passo 1 já vem pronto antes de você gravar; o V2 continua o mesmo save da conta de gravação.
