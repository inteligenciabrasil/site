# _build-rss-feed.ps1 - Gera /feed.xml (RSS 2.0) a partir dos artigos do blog.
#
# Uso:
#   .\_build-rss-feed.ps1
#   .\_build-rss-feed.ps1 -OutputPath "feed.xml" -MaxItems 30

[CmdletBinding()]
param(
    [string]$OutputPath = 'feed.xml',
    [string]$BlogRoot   = 'blog',
    [int]$MaxItems      = 30,
    [string]$SiteUrl    = 'https://inteligenciabrasil.seg.br'
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

Add-Type -AssemblyName System.Web

$blogPath = Join-Path $root $BlogRoot
if (-not (Test-Path $blogPath)) { Write-Error "Blog root nao encontrado: $blogPath"; exit 1 }

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

function Escape-Xml {
    param([string]$s)
    if ([string]::IsNullOrEmpty($s)) { return '' }
    return ($s -replace '&','&amp;' -replace '<','&lt;' -replace '>','&gt;' -replace '"','&quot;' -replace "'",'&apos;')
}

function To-Rfc822 {
    param([string]$IsoDate)
    if ([string]::IsNullOrEmpty($IsoDate)) { return '' }
    try {
        $dt = [DateTimeOffset]::Parse($IsoDate)
        # RFC 822 with English locale (RSS requires English day/month abbreviations)
        return $dt.ToString('ddd, dd MMM yyyy HH:mm:ss zzz', [System.Globalization.CultureInfo]::InvariantCulture).Replace(':',':') -replace '([+-]\d{2}):(\d{2})$','$1$2'
    } catch {
        return ''
    }
}

$articleDirs = Get-ChildItem -Path $blogPath -Directory | Where-Object { -not $_.Name.StartsWith('_') -and $_.Name -ne 'cyber-risk-quantification-decisoes-board' }

Write-Host ("Lendo " + $articleDirs.Count + " artigos...") -ForegroundColor Cyan

$entries = New-Object System.Collections.Generic.List[object]

foreach ($dir in $articleDirs) {
    $indexFile = Join-Path $dir.FullName 'index.html'
    if (-not (Test-Path $indexFile)) { continue }

    $html = [System.IO.File]::ReadAllText($indexFile, [System.Text.UTF8Encoding]::new($false))

    $titleMatch = [regex]::Match($html, '<title>([^<]+)</title>', 'IgnoreCase')
    $title = if ($titleMatch.Success) { [System.Web.HttpUtility]::HtmlDecode($titleMatch.Groups[1].Value).Trim() } else { $dir.Name }
    $title = $title -replace '\s*\|\s*Inteligencia Brasil.*$', '' -replace '\s*\|\s*Intelig.ncia Brasil.*$', '' -replace '\s*\|\s*Blog.*$', ''

    $desc     = Get-Meta -Html $html -Name 'description'
    $section  = Get-Meta -Html $html -Property 'article:section'
    $pubDate  = Get-Meta -Html $html -Property 'article:published_time'

    if ([string]::IsNullOrEmpty($pubDate)) { continue }  # skip undated articles

    $entry = [PSCustomObject]@{
        slug    = $dir.Name
        url     = "$SiteUrl/blog/$($dir.Name)/"
        title   = $title
        desc    = $desc
        section = $section
        date    = $pubDate
        dateRfc = (To-Rfc822 $pubDate)
        dateDt  = [DateTimeOffset]::Parse($pubDate)
    }
    $entries.Add($entry)
}

# Sort by date desc and take MaxItems
$sorted = $entries | Sort-Object -Property dateDt -Descending | Select-Object -First $MaxItems

$nowRfc = [DateTimeOffset]::Now.ToString('ddd, dd MMM yyyy HH:mm:ss zzz', [System.Globalization.CultureInfo]::InvariantCulture) -replace '([+-]\d{2}):(\d{2})$','$1$2'

$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine('<?xml version="1.0" encoding="UTF-8"?>')
[void]$sb.AppendLine('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/">')
[void]$sb.AppendLine('  <channel>')
[void]$sb.AppendLine('    <title>Intelig&#234;ncia Brasil &#8212; Blog de Ciberseguran&#231;a</title>')
[void]$sb.AppendLine('    <link>' + $SiteUrl + '/blog/</link>')
[void]$sb.AppendLine('    <description>Artigos, pesquisas e guias sobre Seguran&#231;a da Informa&#231;&#227;o e Ciberseguran&#231;a em portugu&#234;s.</description>')
[void]$sb.AppendLine('    <language>pt-BR</language>')
[void]$sb.AppendLine('    <atom:link href="' + $SiteUrl + '/feed.xml" rel="self" type="application/rss+xml"/>')
[void]$sb.AppendLine('    <lastBuildDate>' + $nowRfc + '</lastBuildDate>')
[void]$sb.AppendLine('    <generator>_build-rss-feed.ps1</generator>')
[void]$sb.AppendLine('    <copyright>Intelig&#234;ncia Brasil &#8212; CC BY-NC-ND 4.0</copyright>')
[void]$sb.AppendLine('    <managingEditor>contato@inteligenciabrasil.seg.br (Intelig&#234;ncia Brasil)</managingEditor>')
[void]$sb.AppendLine('    <image>')
[void]$sb.AppendLine('      <url>' + $SiteUrl + '/img/logo-inteligencia-brasil-seguranca-da-informacao-cyber-security.webp</url>')
[void]$sb.AppendLine('      <title>Intelig&#234;ncia Brasil &#8212; Blog de Ciberseguran&#231;a</title>')
[void]$sb.AppendLine('      <link>' + $SiteUrl + '/blog/</link>')
[void]$sb.AppendLine('    </image>')

foreach ($e in $sorted) {
    [void]$sb.AppendLine('    <item>')
    [void]$sb.AppendLine('      <title>' + (Escape-Xml $e.title) + '</title>')
    [void]$sb.AppendLine('      <link>' + $e.url + '</link>')
    [void]$sb.AppendLine('      <guid isPermaLink="true">' + $e.url + '</guid>')
    if ($e.dateRfc) { [void]$sb.AppendLine('      <pubDate>' + $e.dateRfc + '</pubDate>') }
    if ($e.section) { [void]$sb.AppendLine('      <category>' + (Escape-Xml $e.section) + '</category>') }
    [void]$sb.AppendLine('      <description>' + (Escape-Xml $e.desc) + '</description>')
    [void]$sb.AppendLine('    </item>')
}

[void]$sb.AppendLine('  </channel>')
[void]$sb.AppendLine('</rss>')

$outFile = Join-Path $root $OutputPath
[System.IO.File]::WriteAllText($outFile, $sb.ToString(), [System.Text.UTF8Encoding]::new($false))

$kb = [math]::Round((Get-Item $outFile).Length / 1024, 1)
Write-Host ("Feed gerado: " + $outFile + " (" + $kb + " KB, " + $sorted.Count + " items)") -ForegroundColor Green
