# Plano de conteúdo — RetroFoot98

`plano-conteudo.html` é a fonte; `plano-conteudo.pdf` é o que se manda para fora.
Para regenerar o PDF depois de mexer no HTML:

    node scripts/conteudo-pdf.mjs

O PDF é paginado pelo próprio Chrome (mesma receita do media kit): as regras de
quebra vivem no `@media print` do HTML. Se aparecerem páginas meio vazias, é
`min-height` a mais nalguma secção — a paginação depende de as secções poderem
fluir, e só as PARTES quebrarem.

O inventário da parte 1 foi levantado do jogo em produção, não de memória. Se o
jogo ganhar telas novas, é essa a parte a atualizar primeiro — os roteiros
dependem dela.
