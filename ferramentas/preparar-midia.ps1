# Prepara a midia do cardapio digital a partir das pastas originais.
#   fotos  -> media/fotos/<id>.webp   (max 800px, ~50-80 KB)
#   videos -> media/videos/<id>.mp4   (copia dos ja otimizados)
#   video sem foto -> extrai um frame do video como capa do card
#   logo   -> media/logo.webp
# No fim gera js/dados/midia.js com o que existe para cada id.
# Rode de novo sempre que mexer em ferramentas/mapa-midia.json.

$ErrorActionPreference = 'Stop'
$raiz   = Split-Path -Parent $PSScriptRoot
$ffmpeg = "$env:LOCALAPPDATA\Microsoft\WinGet\Links\ffmpeg.exe"
if (-not (Test-Path $ffmpeg)) { $ffmpeg = 'ffmpeg' }

$mapa = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'mapa-midia.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$dirFotos  = Join-Path $raiz 'media\fotos'
$dirVideos = Join-Path $raiz 'media\videos'
foreach ($d in $dirFotos, $dirVideos) { if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d | Out-Null } }

# Limita o lado maior a 800px sem ampliar; -2 mantem proporcao e dimensao par.
$escala = "scale=w='if(gt(iw,ih),min(800,iw),-2)':h='if(gt(iw,ih),-2,min(800,ih))'"

function Resolver($base, $nome) {
    if ([System.IO.Path]::IsPathRooted($nome)) { return $nome }
    return Join-Path $base $nome
}

$midia = @{}
function Marcar($id, $tipo) {
    if (-not $midia.ContainsKey($id)) { $midia[$id] = @{ foto = $false; video = $false } }
    $midia[$id][$tipo] = $true
}

# Garrafas (pasta vinhos\): imagens com fundo transparente e muita margem vazia.
# Apara a caixa do que e visivel (cropdetect no canal alfa) para todas as
# garrafas ficarem na mesma escala, e limita a altura a 800px.
function FiltroGarrafa($orig) {
    $saida = cmd /c "`"$ffmpeg`" -hide_banner -i `"$orig`" -vf format=rgba,alphaextract,cropdetect=limit=24:round=2:skip=0 -f null - 2>&1"
    $m = [regex]::Matches(($saida -join "`n"), 'crop=(\d+:\d+:\d+:\d+)')
    $crop = if ($m.Count) { $m[$m.Count - 1].Groups[1].Value } else { $null }
    $f = "scale=w=-2:h='min(800,ih)'"
    if ($crop) { $f = "crop=$crop,$f" }
    return "format=rgba,$f"
}

# ---- fotos
$faltando = @()
foreach ($p in $mapa.fotos.PSObject.Properties) {
    $id = $p.Name; $orig = Resolver $mapa.pastas.fotos $p.Value
    if (-not (Test-Path -LiteralPath $orig)) { $faltando += "foto  $id  <- $orig"; continue }
    $dest = Join-Path $dirFotos "$id.webp"
    if (-not (Test-Path -LiteralPath $dest) -or (Get-Item -LiteralPath $orig).LastWriteTime -gt (Get-Item -LiteralPath $dest).LastWriteTime) {
        $filtro = if ($p.Value -match '(^|\\)vinhos\\') { FiltroGarrafa $orig } else { $escala }
        & $ffmpeg -y -hide_banner -loglevel error -i $orig -vf $filtro -map_metadata -1 -c:v libwebp -quality 78 -compression_level 6 $dest
        if ($LASTEXITCODE -ne 0) { $faltando += "foto  $id  ERRO ffmpeg"; continue }
    }
    Marcar $id 'foto'
}

# ---- videos
foreach ($p in $mapa.videos.PSObject.Properties) {
    $id = $p.Name; $orig = Resolver $mapa.pastas.videos $p.Value
    if (-not (Test-Path -LiteralPath $orig)) { $faltando += "video $id  <- $orig"; continue }
    $dest = Join-Path $dirVideos "$id.mp4"
    if (-not (Test-Path -LiteralPath $dest) -or (Get-Item -LiteralPath $orig).Length -ne (Get-Item -LiteralPath $dest).Length) {
        Copy-Item -LiteralPath $orig -Destination $dest -Force
    }
    Marcar $id 'video'
}

# ---- video sem foto: frame do video vira a capa do card
$frames = @()
foreach ($id in @($midia.Keys)) {
    if ($midia[$id].video -and -not $midia[$id].foto) {
        $dest = Join-Path $dirFotos "$id.webp"
        if (-not (Test-Path -LiteralPath $dest)) {
            & $ffmpeg -y -hide_banner -loglevel error -ss 1.5 -i (Join-Path $dirVideos "$id.mp4") -frames:v 1 -vf $escala -c:v libwebp -quality 80 $dest
        }
        if (Test-Path -LiteralPath $dest) { $midia[$id].foto = $true; $frames += $id }
    }
}

# ---- logo (fundo transparente, versao clara para o cabecalho escuro)
$logoOrig = Join-Path $raiz '..\assets\logo.png'
$logoDest = Join-Path $raiz 'media\logo.webp'
if ((Test-Path $logoOrig) -and -not (Test-Path $logoDest)) {
    & $ffmpeg -y -hide_banner -loglevel error -i $logoOrig -vf "scale=360:-2" -c:v libwebp -quality 88 $logoDest
}

# ---- js/dados/midia.js
$linhas = @('// GERADO por ferramentas/preparar-midia.ps1 - nao edite a mao.', '// id -> { foto, video } disponiveis em media/.', 'export const midia = {')
foreach ($id in ($midia.Keys | Sort-Object)) {
    $f = if ($midia[$id].foto) { 'true' } else { 'false' }
    $v = if ($midia[$id].video) { 'true' } else { 'false' }
    $linhas += "  '$id': { foto: $f, video: $v },"
}
$linhas += '};'
$dirDados = Join-Path $raiz 'js\dados'
if (-not (Test-Path $dirDados)) { New-Item -ItemType Directory -Path $dirDados | Out-Null }
[System.IO.File]::WriteAllLines((Join-Path $dirDados 'midia.js'), $linhas, (New-Object System.Text.UTF8Encoding $false))

# ---- resumo
$nf = (Get-ChildItem $dirFotos -File).Count; $nv = (Get-ChildItem $dirVideos -File).Count
$kbF = [math]::Round(((Get-ChildItem $dirFotos -File | Measure-Object Length -Sum).Sum)/1KB)
$mbV = [math]::Round(((Get-ChildItem $dirVideos -File | Measure-Object Length -Sum).Sum)/1MB,1)
"fotos:  $nf arquivos, $kbF KB no total"
"videos: $nv arquivos, $mbV MB no total"
if ($frames.Count) { "capas extraidas do video (sem foto propria): " + ($frames -join ', ') }
if ($faltando.Count) { "FALTANDO:"; $faltando | ForEach-Object { "  $_" } }
"midia.js: $($midia.Count) ids"
