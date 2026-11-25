# Branch `tools` — builders do site, versionados fora do ar

Esta branch **não é servida pelo GitHub Pages** e **nunca deve ser mesclada no
`main`**. Ela existe por um motivo específico.

## Por que os builders não moram no `main`

No `main`, a raiz do repositório **é a raiz do site**: tudo que o git versiona
é publicado em `inteligenciabrasil.seg.br`. Por isso o `.gitignore` tem `/_*`,
por prefixo e não por extensão — a regra antiga era `/_*.ps1` e deixou
`_audit-robots.test.js` ir ao ar, respondendo 200 em produção (medido em
13/11/2026).

Medido em 25/11/2026: a regra de WAF que devolve 403 cobre **3 caminhos
específicos**, não o padrão `_*`. `/_build-blog-index.ps1` e similares voltam
**404**, ou seja, se fossem versionados no `main` passariam a responder **200**.

Daí esta branch órfã: versiona os builders sem criar uma única URL nova no site.

## O que mora aqui

| arquivo | gera |
|---|---|
| `_build-blog-index.ps1` | `blog/_data/search-index.json` e o carimbo `?v=` em `blog/index.html` e `newsletter/index.html` |
| `_build-sitemap.ps1` | `sitemap.xml` |
| `_build-rss-feed.ps1` | `feed.xml` |

Ficaram de fora, de propósito: `_inject-csp.ps1` (publicar o injetor entrega o
mecanismo do sentinela sem ganho), os 13 `_audit-*.ps1` e os 38 `_tmp_*.ps1`.

## Como usar

Copiar para a raiz do repositório no `main` e rodar de lá. Eles esperam estar
na raiz (`$PSScriptRoot`):

    powershell -ExecutionPolicy Bypass -File _build-blog-index.ps1

**Os builders rodam DEPOIS do commit de conteúdo**, senão hubs e `/blog/` saem
com `lastmod` defasado.

## Cuidado conhecido

`_build-blog-index.ps1` localiza o corpo do artigo **depois** de remover
script, style e comentário. Isso não é estilo: 123 dos 162 artigos têm um
comentário CSS que cita a tag literalmente (`grid do Bootstrap usado em
<main>`), dentro do `<style>` e 9,7 KB antes do `<main>` verdadeiro. Sem a
limpeza prévia o match começa dentro do `<style>` e o índice recebe o CSS do
Bootstrap no lugar do texto — "padding" passava a casar 123 artigos. Corrigido
em 25/11/2026 (`4a97f9f` no `main`).
