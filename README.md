# inteligenciabrasil.seg.br

Site institucional da Inteligência Brasil. HTML estático servido pelo GitHub Pages
a partir do branch `main`, atrás da Cloudflare. Não há etapa de build no deploy:
o que está versionado é o que vai ao ar.

```
git add . && git commit && git push      # publica em ~1 min
```

## Arquivos gerados, não editados à mão

Três arquivos são derivados do conteúdo e **não devem ser editados manualmente** —
a próxima regeneração desfaz a edição:

| Arquivo | Gerador |
| --- | --- |
| `sitemap.xml` | `_build-sitemap.ps1` |
| `feed.xml` | `_build-rss-feed.ps1` |
| `blog/_data/search-index.json` | `_build-blog-index.ps1` |

Os geradores ficam na raiz com prefixo `_` e são **ignorados pelo git**
(`.gitignore`: `/_*.ps1`), porque o GitHub Pages serve qualquer arquivo versionado
e não há motivo para publicar scripts de build. Eles vivem só na cópia local.

### sitemap.xml

```powershell
powershell -ExecutionPolicy Bypass -File .\_build-sitemap.ps1 -DryRun   # só mostra
powershell -ExecutionPolicy Bypass -File .\_build-sitemap.ps1           # grava
```

Varre o filesystem, então **páginas novas entram sozinhas**. Exclui automaticamente:

- pastas de asset (`css`, `js`, `img`, `webfonts`) e qualquer pasta com prefixo `_`
- páginas com `<meta name="robots" ... noindex>`
- páginas com `<meta http-equiv="refresh">` (as cascas de redirect das LPs)
- `404.html` e o arquivo de verificação do Search Console

Converte `/foo/index.html` em `/foo/` e guarda backup do sitemap anterior em
`_data/backups/`.

**`lastmod`.** O mtime do filesystem não serve: qualquer script de edição em massa
reescreve as 223 páginas no mesmo instante e o sitemap sai com uma data única em
tudo — foi exatamente o que o Search Console apontou em 03/10/2026, e um campo
uniforme é um campo que o Google ignora. O gerador resolve a data em três níveis:

1. **`dateModified` (ou `datePublished`) do JSON-LD.** Data de conteúdo de verdade,
   mantida à mão pelo selo "Revisado em". Cobre os 149 artigos do blog.
2. **Data do último commit que tocou o arquivo** (`git log -1 --format=%cs`).
   Usada nas LPs, ferramentas e hubs, que não têm schema com data.
3. **mtime**, só para arquivo que ainda não entrou no git.

O gerador imprime no fim quantos `lastmod` distintos saíram. **Se esse número cair
para perto de 1, o campo voltou a ser inútil** — provavelmente uma edição em massa
recente empurrou o nível 2 para a mesma data em muitos arquivos. Nesse caso,
atualize o `dateModified` das páginas que realmente mudaram em vez de confiar no git.

## Cache da Cloudflare

A Cloudflare serve CSS e JS com cache agressivo e **o `git push` não invalida nada**.
Um `home.min.js` ficou 11 dias servindo a versão velha. Ao alterar qualquer CSS ou JS:
versione no nome ou na URL (`?v=<hash>`) e faça purge do arquivo no painel.

## CSP

A política vive em **três** lugares que precisam concordar (o navegador aplica a
interseção): o ruleset de response header da Cloudflare, a `<meta>` de cada página e
`.planning/security/csp.md`, que é a fonte de onde o `_inject-csp.ps1` lê.
**Página nova precisa receber a `<meta>` pelo `_inject-csp.ps1`.**

## `.nojekyll`

Obrigatório. Sem ele o Jekyll do GitHub Pages ignora as pastas com prefixo `_` e a
busca do blog para de funcionar.
