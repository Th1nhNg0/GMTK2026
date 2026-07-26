$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$distPath = Join-Path $projectRoot "dist"
$indexPath = Join-Path $distPath "index.html"
$releasePath = Join-Path $projectRoot "release"
$zipPath = Join-Path $releasePath "last-sum-standing-html5.zip"
$legacyZipPath = Join-Path $releasePath "countdown-roguelike-html5.zip"

if (-not (Test-Path -LiteralPath $indexPath -PathType Leaf)) {
  throw "Production build is missing. Run npm run build first."
}

New-Item -ItemType Directory -Force -Path $releasePath | Out-Null
if (Test-Path -LiteralPath $zipPath -PathType Leaf) {
  Remove-Item -LiteralPath $zipPath -Force
}
if (Test-Path -LiteralPath $legacyZipPath -PathType Leaf) {
  Remove-Item -LiteralPath $legacyZipPath -Force
}

Compress-Archive -Path (Join-Path $distPath "*") -DestinationPath $zipPath -CompressionLevel Optimal
Write-Output $zipPath
