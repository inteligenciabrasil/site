# _build-blog-index.ps1 - Gera blog/search-index.json a partir dos artigos do blog.
# Indexa: titulo, descricao, secao (article:section), keywords, slug, primeiros 1500 chars do article-body.
#
# Uso:
#   .\_build-blog-index.ps1
#   .\_build-blog-index.ps1 -OutputPath "blog/search-index.json"

[CmdletBinding()]
param(
    [string]$OutputPath = 'blog\_data\search-index.json',
    [string]$BlogRoot   = 'blog',
    [int]$BodyChars     = 1500
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

$blogPath = Join-Path $root $BlogRoot
if (-not (Test-Path $blogPath)) { Write-Error "Blog root nao encontrado: $blogPath"; exit 1 }

# Lista subpastas do blog (cada uma e um artigo). Ignora pastas internas (_*).
$articleDirs = Get-ChildItem -Path $blogPath -Directory | Where-Object { -not $_.Name.StartsWith('_') -and $_.Name -ne 'cyber-risk-quantification-decisoes-board' }

Write-Host "Indexando $($articleDirs.Count) artigos..." -ForegroundColor Cyan

function Get-Meta {
    param([string]$Html, [string]$Property, [string]$Name)
    if ($Property) {
        $m = [regex]::Match($Html, '<meta\s+property\s*=\s*"' + [regex]::Escape($Property) + '"\s+content\s*=\s*"([^"]*)"', 'IgnoreCase')
        if (-not $m.Success) { $m = [regex]::Match($Html, '<meta\s+content\s*=\s*"([^"]*)"\s+property\s*=\s*"' + [regex]::Escape($Property) + '"', 'IgnoreCase') }
    } elseif ($Name) {
        $m = [regex]::Match($Html, '<meta\s+name\s*=\s*"' + [regex]::Escape($Name) + '"\s+content\s*=\s*"([^"]*)"', 'IgnoreCase')
    }
    if ($m.Success) { return [System.Web.HttpUtility]::HtmlDecode($m.Groups[1].Value) }
    return ''
}

Add-Type -AssemblyName System.Web

$entries = @()
$skipped = 0

foreach ($dir in $articleDirs) {
    $indexFile = Join-Path $dir.FullName 'index.html'
    if (-not (Test-Path $indexFile)) { $skipped++; continue }

    $html = [System.IO.File]::ReadAllText($indexFile)

    # Title
    $titleMatch = [regex]::Match($html, '<title>([^<]+)</title>', 'IgnoreCase')
    $title = if ($titleMatch.Success) { [System.Web.HttpUtility]::HtmlDecode($titleMatch.Groups[1].Value).Trim() } else { $dir.Name }
    # Trim "| Inteligencia Brasil" suffix
    $title = $title -replace '\s*\|\s*Inteligencia Brasil.*$', '' -replace '\s*\|\s*Intelig.ncia Brasil.*$', ''

    $desc     = Get-Meta -Html $html -Name 'description'
    $section  = Get-Meta -Html $html -Property 'article:section'
    $keywords = Get-Meta -Html $html -Name 'keywords'
    $pubDate  = Get-Meta -Html $html -Property 'article:published_time'

    # Extrai texto do article-body (primeiros N chars depois de stripar HTML)
    # Limpar script/style/comentario ANTES de localizar a regiao: um comentario
    # CSS cita a tag literal ("grid do Bootstrap usado em <main>") em 123 dos
    # 162 artigos, 9,7 KB antes do <main> verdadeiro. Sem esta limpeza o match
    # comeca dentro do <style>, o strip de <style>...</style> abaixo nao acha a
    # tag de abertura, e o indice recebe o CSS do Bootstrap no lugar do texto.
    $clean = [regex]::Replace($html,  '<script[\s\S]*?</script>', '', 'IgnoreCase')
    $clean = [regex]::Replace($clean, '<style[\s\S]*?</style>',   '', 'IgnoreCase')
    $clean = [regex]::Replace($clean, '<!--[\s\S]*?-->',          '')
    # A classe real e article-content; 'article-body' nunca casou em nenhum dos
    # 162 artigos, por isso o fallback <main> sempre foi o caminho usado.
    $bodyMatch = [regex]::Match($clean, '<article[^>]*class="[^"]*article-content[^"]*"[^>]*>([\s\S]*?)</article>', 'IgnoreCase')
    if (-not $bodyMatch.Success) {
        $bodyMatch = [regex]::Match($clean, '<main[^>]*>([\s\S]*?)</main>', 'IgnoreCase')
    }
    $bodyText = ''
    if ($bodyMatch.Success) {
        $stripped = $bodyMatch.Groups[1].Value
        $stripped = [regex]::Replace($stripped, '<script[\s\S]*?</script>', '')
        $stripped = [regex]::Replace($stripped, '<style[\s\S]*?</style>', '')
        $stripped = [regex]::Replace($stripped, '<[^>]+>', ' ')
        $stripped = [regex]::Replace($stripped, '\s+', ' ').Trim()
        $stripped = [System.Web.HttpUtility]::HtmlDecode($stripped)
        if ($stripped.Length -gt $BodyChars) { $stripped = $stripped.Substring(0, $BodyChars) }
        $bodyText = $stripped
    }

    # Conta internal links no body (mesma regex/regra do _audit-linking-density.ps1, Plan 5-05)
    # Regiao propria, <main> como no audit: o body de busca usa article-content,
    # que e mais estreito e deixaria de contar os links do breadcrumb e do rodape
    # do artigo. Trocar a regiao aqui divergiria do audit em 123 artigos.
    $linkMatch = [regex]::Match($clean, '<main[^>]*>([\s\S]*?)</main>', 'IgnoreCase')
    if (-not $linkMatch.Success) {
        $linkMatch = [regex]::Match($clean, '<article[^>]*>([\s\S]*?)</article>', 'IgnoreCase')
    }
    $linkBody = if ($linkMatch.Success) { $linkMatch.Groups[1].Value } else { '' }
    $hrefPattern = '<a\s+[^>]*href="(\.\./[^"#]+|/[a-z][^"#]+)"'
    $internalLinkCount = ([regex]::Matches($linkBody, $hrefPattern)).Count

    $entries += [PSCustomObject]@{
        slug               = $dir.Name
        url                = "/blog/$($dir.Name)/"
        title              = $title
        description        = $desc
        section            = $section
        keywords           = $keywords
        date               = $pubDate
        body               = $bodyText
        internal_link_count = $internalLinkCount
    }
}

$outFile = Join-Path $root $OutputPath
$outDir = Split-Path $outFile -Parent
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
$json = $entries | ConvertTo-Json -Depth 4 -Compress
[System.IO.File]::WriteAllText($outFile, $json, [System.Text.UTF8Encoding]::new($false))

$kb = [math]::Round((Get-Item $outFile).Length / 1024, 1)
Write-Host "Indice gerado: $outFile ($kb KB, $($entries.Count) artigos, $skipped pulados)" -ForegroundColor Green

# --- carimba o ?v= nos consumidores do indice -------------------------------
# A borda serve search-index.json com Cache-Control: max-age=31536000 (1 ano).
# Sem versao na URL, nenhum deploy substitui o arquivo e so purge_everything
# destrava: em 13/11/2026 a busca do blog rodou 3,7 dias com indice de 09/11,
# com 4 artigos invisiveis e 2 titulos com acento velho. O cliente tambem nao
# escapa: a borda ignora no-cache e Pragma do request.
# O carimbo e o hash do proprio indice, entao so muda quando o indice muda.
$sha  = [System.Security.Cryptography.SHA256]::Create()
$hash = ([BitConverter]::ToString($sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($json)))).Replace('-','').Substring(0,10).ToLower()

$consumidores = @(
    @{ Path = 'blog\index.html';       Url = './_data/search-index.json' },
    @{ Path = 'newsletter\index.html'; Url = '../blog/_data/search-index.json' }
)
$enc = [System.Text.UTF8Encoding]::new($false)
foreach ($c in $consumidores) {
    $p = Join-Path $root $c.Path
    if (-not (Test-Path $p)) { Write-Error "Consumidor do indice ausente: $p"; exit 1 }

    $html = [System.IO.File]::ReadAllText($p, $enc)
    $pat  = [regex]::Escape($c.Url) + '(\?v=[0-9a-f]+)?'
    $ms   = [regex]::Matches($html, $pat)
    if ($ms.Count -ne 1) {
        Write-Error "$($c.Path): $($ms.Count) ocorrencias da URL do indice, esperado 1. Nada carimbado."
        exit 1
    }
    $alvo = $c.Url + '?v=' + $hash
    if ($ms[0].Value -eq $alvo) { Write-Host "  ?v= ja atual em $($c.Path)" -ForegroundColor DarkGray; continue }

    $novo = $html.Remove($ms[0].Index, $ms[0].Length).Insert($ms[0].Index, $alvo)

    # portao: a unica diferenca tem de ser o trecho carimbado
    $delta = $novo.Length - $html.Length
    if ($delta -ne ($alvo.Length - $ms[0].Length)) { Write-Error "$($c.Path): delta inesperado ($delta)"; exit 1 }
    if ($novo.Substring(0, $ms[0].Index) -ne $html.Substring(0, $ms[0].Index)) { Write-Error "$($c.Path): mudou antes do trecho"; exit 1 }
    if ($novo.Substring($ms[0].Index + $alvo.Length) -ne $html.Substring($ms[0].Index + $ms[0].Length)) { Write-Error "$($c.Path): mudou depois do trecho"; exit 1 }
    if (([regex]::Matches($novo, $pat)).Count -ne 1) { Write-Error "$($c.Path): nao ficou com 1 ocorrencia"; exit 1 }

    [System.IO.File]::WriteAllText($p, $novo, $enc)
    Write-Host "  ?v=$hash carimbado em $($c.Path)" -ForegroundColor Green
}
