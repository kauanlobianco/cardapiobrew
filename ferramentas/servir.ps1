# Servidor estatico minimo para testar o cardapio localmente (ES modules
# nao carregam via file://). Nao e para producao - em producao e um host
# estatico qualquer (Netlify, Vercel, Cloudflare Pages, GitHub Pages).
#   powershell -File ferramentas/servir.ps1 [-Porta 8080]
# (arquivo mantido em ASCII puro: o PowerShell 5.1 le .ps1 sem BOM como ANSI
#  e um travessao/aspas tipograficas viram delimitador de string)
param([int]$Porta = 8080)

$raiz = Split-Path -Parent $PSScriptRoot
$mime = @{
  '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.js'='text/javascript; charset=utf-8'
  '.json'='application/json'; '.webp'='image/webp'; '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'
  '.svg'='image/svg+xml'; '.mp4'='video/mp4'; '.webmanifest'='application/manifest+json'; '.ico'='image/x-icon'
}

$http = New-Object System.Net.HttpListener
$http.Prefixes.Add("http://localhost:$Porta/")
$http.Start()
Write-Host "Cardapio em http://localhost:$Porta/  (raiz: $raiz)  - Ctrl+C para parar"

while ($http.IsListening) {
  $ctx = $http.GetContext()
  $req = $ctx.Request; $res = $ctx.Response
  try {
    $rel = [uri]::UnescapeDataString($req.Url.AbsolutePath).TrimStart('/')
    if ($rel -eq '') { $rel = 'index.html' }
    $arq = Join-Path $raiz $rel
    if ((Test-Path -LiteralPath $arq -PathType Container)) { $arq = Join-Path $arq 'index.html' }
    if (-not (Test-Path -LiteralPath $arq -PathType Leaf) -or -not ([IO.Path]::GetFullPath($arq)).StartsWith($raiz)) {
      $res.StatusCode = 404; $b = [Text.Encoding]::UTF8.GetBytes("404 $rel"); $res.OutputStream.Write($b, 0, $b.Length)
    } else {
      $ext = [IO.Path]::GetExtension($arq).ToLower()
      $res.ContentType = if ($mime[$ext]) { $mime[$ext] } else { 'application/octet-stream' }
      $res.Headers['Cache-Control'] = 'no-cache'
      $bytes = [IO.File]::ReadAllBytes($arq)
      # Range simples (video): "bytes=a-b"
      $range = $req.Headers['Range']
      if ($range -and $range -match '^bytes=(\d*)-(\d*)$') {
        $a = if ($Matches[1]) { [long]$Matches[1] } else { 0 }
        $b = if ($Matches[2]) { [long]$Matches[2] } else { $bytes.Length - 1 }
        if ($b -ge $bytes.Length) { $b = $bytes.Length - 1 }
        $res.StatusCode = 206
        $res.Headers['Content-Range'] = "bytes $a-$b/$($bytes.Length)"
        $res.Headers['Accept-Ranges'] = 'bytes'
        $res.ContentLength64 = $b - $a + 1
        $res.OutputStream.Write($bytes, $a, $b - $a + 1)
      } else {
        $res.Headers['Accept-Ranges'] = 'bytes'
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      }
    }
  } catch {
    try { $res.StatusCode = 500 } catch {}
  } finally {
    try { $res.OutputStream.Close() } catch {}
  }
}
