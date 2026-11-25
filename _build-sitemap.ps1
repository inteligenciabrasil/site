# _build-sitemap.ps1 - Gera sitemap.xml automaticamente a partir do filesystem.
# Varre todas as pastas, identifica paginas publicas, define priority/changefreq por padrao
# e resolve lastmod por data real de conteudo (ver Get-Lastmod).
#
# Uso:
#   .\_build-sitemap.ps1                 # gera D:\GitHub\site\site2\sitemap.xml
#   .\_build-sitemap.ps1 -DryRun         # mostra o que seria gerado sem escrever
#   .\_build-sitemap.ps1 -OutputPath ... # caminho customizado

[CmdletBinding()]
param(
    [string]$OutputPath = 'sitemap.xml',
    [string]$BaseUrl    = 'https://inteligenciabrasil.seg.br',
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

# Pastas que NAO entram no sitemap (assets/internas)
# 'confirmado'/'descadastro': paginas transacionais da newsletter, so alcancadas pelo
# link do e-mail e marcadas noindex. Sem isto o proximo rebuild as reinclui no sitemap.
# 'diagnostico': familia de questionarios enviados por link a cliente em negociacao,
# todos noindex. O filtro casa por SEGMENTO de path, entao esta entrada unica cobre
# tambem todo questionario novo criado sob /diagnostico/ -- nao precisa de uma entrada
# por questionario. Substituiu 'diagnostico-conscientizacao' em 12/11/2026, quando o
# diretorio virou /diagnostico/conscientizacao/ e o caminho antigo passou a dar 404.
$excludeDirs = @('css','js','img','webfonts','melhorias_page_speed','lighthouse-reports','.git','.claude','.planning','node_modules','confirmado','descadastro','diagnostico','cyber-risk-quantification-decisoes-board')

# Arquivos que NAO entram no sitemap
$excludeFiles = @(
    '404.html',
    'googlecdf7419dd025d784.html',  # verificacao do Google Search Console
    'sitemap.xml',
    'sitemap.xml.bak'
)

# Regras de priority/changefreq por padrao de path. Primeira regra que casa, vence.
# Path = caminho relativo apos $BaseUrl (com / inicial e final quando for diretorio).
$rules = @(
    @{ Pattern = '^/$';                                  Priority = '1.0'; ChangeFreq = 'weekly'  }
    @{ Pattern = '^/blog/$';                             Priority = '0.9'; ChangeFreq = 'weekly'  }
    @{ Pattern = '^/ferramentas/$';                      Priority = '0.9'; ChangeFreq = 'weekly'  }
    @{ Pattern = '^/recursos/$';                         Priority = '0.8'; ChangeFreq = 'monthly' }
    @{ Pattern = '^/sobre/$';                            Priority = '0.8'; ChangeFreq = 'monthly' }
    @{ Pattern = '^/lp/[^/]+/$';                         Priority = '0.9'; ChangeFreq = 'weekly'  }
    @{ Pattern = '^/lp/[^/]+/.+';                        Priority = '0.7'; ChangeFreq = 'monthly' }
    @{ Pattern = '^/ferramentas/[^/]+/$';                Priority = '0.9'; ChangeFreq = 'monthly' }
    @{ Pattern = '^/blog/[^/]+/$';                       Priority = '0.8'; ChangeFreq = 'monthly' }
    @{ Pattern = '^/documentos/.+';                      Priority = '0.4'; ChangeFreq = 'yearly'  }
    @{ Pattern = '^/politica-de-privacidade\.html$';     Priority = '0.5'; ChangeFreq = 'yearly'  }
)

function Match-Rule {
    param([string]$Path)
    foreach ($r in $rules) {
        if ($Path -match $r.Pattern) { return $r }
    }
    return @{ Priority = '0.5'; ChangeFreq = 'monthly' }  # fallback
}

# O mtime do filesystem e inutil aqui: qualquer script de edicao em massa reescreve
# os 223 arquivos no mesmo instante, e o sitemap sai com um unico lastmod em tudo.
# O Google entao ignora o campo. Ordem de preferencia:
#   1. dateModified / datePublished do JSON-LD - data de conteudo de verdade, mantida
#      a mao pelo selo "Revisado em" (cobre os 149 artigos, 43 datas distintas).
#   2. data do ultimo commit que tocou o arquivo - para LPs, ferramentas e hubs, que
#      nao tem schema com data.
#   3. mtime, so se o arquivo ainda nao esta no git.
function Get-Lastmod {
    param([System.IO.FileInfo]$File, [string]$Html)
    if ($Html -match '"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})')  { return $Matches[1] }
    if ($Html -match '"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})') { return $Matches[1] }
    $d = (& git -C $root log -1 --format=%cs -- $File.FullName) | Select-Object -First 1
    if ($d -match '^\d{4}-\d{2}-\d{2}$') { return $d }
    return $File.LastWriteTime.ToString('yyyy-MM-dd')
}

function Path-To-Url {
    param([System.IO.FileInfo]$File)
    $rel = $File.FullName.Substring($root.Length).Replace('\','/')
    if (-not $rel.StartsWith('/')) { $rel = '/' + $rel }
    # /foo/index.html -> /foo/   ;   /index.html -> /
    if ($rel -match '/index\.html$') {
        $rel = $rel -replace '/index\.html$', '/'
    }
    return $rel
}

# Coleta arquivos.
# A fonte e o INDICE DO GIT, nao o disco. Motivo: em 20/10/2026 este builder
# varreu o disco e colocou 5 URLs de .planning/*.intro.html no sitemap - arquivos
# que NUNCA foram versionados, portanto nunca publicados. O Google leu o sitemap
# e rastreou as 5 em 23/10, todas 404. A lista negra abaixo so ganhou '.planning'
# DEPOIS do vazamento; lista negra protege do que ja aconteceu, nao do proximo
# diretorio local de scratch. Derivar do git torna o vazamento impossivel por
# construcao: o que nao esta versionado nao vai ao ar, logo nao entra no sitemap.
# A lista negra continua valendo, agora so para excluir coisa PUBLICADA de
# proposito (casca de redirect, formulario de diagnostico, confirma/descadastro).
$tracked = @{}
& git -C $root ls-files '*.html' | ForEach-Object {
    if ($_) { $tracked[$_.Trim()] = $true }
}
if ($tracked.Count -eq 0) { Write-Error "git ls-files nao devolveu nenhum HTML - abortando para nao gerar sitemap vazio"; exit 1 }

$candidates = Get-ChildItem -Path $root -Recurse -File -Include '*.html' | Where-Object {
    $rel = $_.FullName.Substring($root.Length).TrimStart('\','/')
    $segments = $rel.Split(@([char]'\', [char]'/'))
    # Portao: so entra no sitemap o que o git versiona, logo o que vai ao ar.
    if (-not $tracked.ContainsKey(($segments -join '/'))) { return $false }
    $excluded = $false
    foreach ($s in $segments) {
        # Convention: any folder starting with "_" is internal (build artifacts, data, etc.)
        if ($s.StartsWith('_')) { $excluded = $true; break }
        if ($excludeDirs -contains $s) { $excluded = $true; break }
    }
    if ($excluded) { return $false }
    if ($excludeFiles -contains $_.Name) { return $false }
    # Exclui paginas noindex ou com redirect (meta refresh): nao sao URLs canonicas finais.
    # Ancorado em <meta ... > de proposito. A versao anterior era
    # 'name="robots"[^>]*noindex', e [^>]* atravessa qualquer texto sem '>' - entao o
    # script inline de /blog/, que faz setAttribute('content','noindex, follow') quando
    # existe ?q=, casava e derrubava o hub do blog do sitemap. Exigir o '<meta' impede
    # isso, porque a string no JS nao tem a tag. Os dois lookaheads cobrem as duas
    # ordens de atributo que convivem no repo (name antes de content e vice-versa).
    $html = [System.IO.File]::ReadAllText($_.FullName, (New-Object System.Text.UTF8Encoding($false)))
    if ($html -match '<meta(?=[^>]*name=["'']robots["''])(?=[^>]*noindex)[^>]*>') { return $false }
    if ($html -match 'http-equiv=["'']refresh["'']') { return $false }
    return $true
}

Write-Host "Arquivos HTML candidatos: $($candidates.Count)" -ForegroundColor Cyan

# Monta entries
$entries = @()
foreach ($f in $candidates) {
    $urlPath = Path-To-Url -File $f
    $loc = $BaseUrl + $urlPath
    $rule = Match-Rule -Path $urlPath
    $html = [System.IO.File]::ReadAllText($f.FullName, (New-Object System.Text.UTF8Encoding($false)))
    $lastmod = Get-Lastmod -File $f -Html $html
    $entries += [PSCustomObject]@{
        Url        = $loc
        Path       = $urlPath
        Lastmod    = $lastmod
        Priority   = $rule.Priority
        ChangeFreq = $rule.ChangeFreq
        SortKey    = $rule.Priority + '_' + $urlPath
    }
}

# Ordena: por priority desc, depois alfabetico
$entries = $entries | Sort-Object -Property @{Expression='Priority'; Descending=$true}, Path

# Monta XML
$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('<?xml version="1.0" encoding="UTF-8"?>')
[void]$sb.AppendLine('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
[void]$sb.AppendLine('        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"')
[void]$sb.AppendLine('        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9')
[void]$sb.AppendLine('        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">')
[void]$sb.AppendLine('')

# Agrupa por priority para gerar comentarios
$lastPriority = ''
$priorityLabels = @{
    '1.0' = 'Pagina Principal'
    '0.9' = 'Landing Pages, Blog, Ferramentas'
    '0.8' = 'Artigos do Blog, Sobre, Recursos'
    '0.7' = 'Sub-paginas de LP'
    '0.5' = 'Documentos Legais'
    '0.4' = 'Documentos Internos'
}
foreach ($e in $entries) {
    if ($e.Priority -ne $lastPriority) {
        $label = $priorityLabels[$e.Priority]
        if (-not $label) { $label = "Priority $($e.Priority)" }
        [void]$sb.AppendLine("    <!-- $label -->")
        $lastPriority = $e.Priority
    }
    [void]$sb.AppendLine('    <url>')
    [void]$sb.AppendLine("        <loc>$($e.Url)</loc>")
    [void]$sb.AppendLine("        <lastmod>$($e.Lastmod)</lastmod>")
    [void]$sb.AppendLine("        <changefreq>$($e.ChangeFreq)</changefreq>")
    [void]$sb.AppendLine("        <priority>$($e.Priority)</priority>")
    [void]$sb.AppendLine('    </url>')
    [void]$sb.AppendLine('')
}

[void]$sb.AppendLine('</urlset>')
$xml = $sb.ToString()

if ($DryRun) {
    Write-Host "`n=== DRY RUN ===" -ForegroundColor Yellow
    Write-Host "URLs que seriam geradas: $($entries.Count)"
    $entries | Group-Object Priority | Sort-Object Name -Descending | ForEach-Object {
        Write-Host "  priority $($_.Name): $($_.Count)"
    }
    Write-Host "`nPrimeiras 10 URLs:"
    $entries | Select-Object -First 10 Path, Priority, ChangeFreq, Lastmod | Format-Table -AutoSize
    return
}

$outFile = if ([System.IO.Path]::IsPathRooted($OutputPath)) { $OutputPath } else { Join-Path $root $OutputPath }

# Backup automatico do sitemap atual em _data/backups/ (fora da raiz servida)
if (Test-Path $outFile) {
    $backupDir = Join-Path $root '_data\backups'
    if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Force -Path $backupDir | Out-Null }
    $bakName = 'sitemap-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.xml.bak'
    $bakPath = Join-Path $backupDir $bakName
    Copy-Item $outFile $bakPath -Force
    Write-Host "Backup: $bakPath" -ForegroundColor DarkGray
}

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($outFile, $xml, $utf8NoBom)

$kb = [math]::Round((Get-Item $outFile).Length / 1024, 1)
Write-Host "`nGerado: $outFile ($kb KB, $($entries.Count) URLs)" -ForegroundColor Green
$entries | Group-Object Priority | Sort-Object Name -Descending | ForEach-Object {
    Write-Host "  priority $($_.Name): $($_.Count) URLs"
}

# Variedade de lastmod: se cair para 1, o campo voltou a ser ignorado pelo Google.
$distinct = ($entries | Select-Object -ExpandProperty Lastmod -Unique).Count
Write-Host "`nlastmod distintos: $distinct de $($entries.Count) URLs" -ForegroundColor Green
$entries | Group-Object Lastmod | Sort-Object Count -Descending | Select-Object -First 5 | ForEach-Object {
    Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor DarkGray
}
