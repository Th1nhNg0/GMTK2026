$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$zipPath = Join-Path $projectRoot "release\last-sum-standing-html5.zip"
$coverPath = Join-Path $projectRoot "itch-assets\cover.png"
$bannerPath = Join-Path $projectRoot "itch-assets\banner.png"

if (-not (Test-Path -LiteralPath $zipPath -PathType Leaf)) {
  throw "Release ZIP is missing: $zipPath"
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
try {
  if ($archive.Entries.FullName -match '\\') {
    throw "Release ZIP contains Windows path separators; itch.io will not find nested assets."
  }
}
finally {
  $archive.Dispose()
}

$systemTemp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$tempRoot = [System.IO.Path]::GetFullPath(
  [System.IO.Path]::Combine($systemTemp, "last-sum-standing-release-$([System.Guid]::NewGuid())")
)
if (-not $tempRoot.StartsWith($systemTemp, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to use a verification directory outside the system temp folder."
}

New-Item -ItemType Directory -Path $tempRoot | Out-Null

try {
  Expand-Archive -LiteralPath $zipPath -DestinationPath $tempRoot
  $indexPath = Join-Path $tempRoot "index.html"
  if (-not (Test-Path -LiteralPath $indexPath -PathType Leaf)) {
    throw "The ZIP does not contain a top-level index.html file."
  }

  $files = @(Get-ChildItem -LiteralPath $tempRoot -Recurse -File)
  if ($files.Count -gt 1000) {
    throw "The ZIP expands to $($files.Count) files; itch.io permits at most 1000."
  }

  $totalBytes = ($files | Measure-Object -Property Length -Sum).Sum
  if ($totalBytes -gt 500MB) {
    throw "The extracted build exceeds itch.io's 500 MB limit."
  }

  $oversized = $files | Where-Object Length -GT 200MB
  if ($oversized) {
    throw "The build contains a file larger than itch.io's 200 MB per-file limit."
  }

  $longPath = $files | Where-Object { $_.FullName.Substring($tempRoot.Length + 1).Length -gt 240 }
  if ($longPath) {
    throw "The build contains a path longer than itch.io's 240-character limit."
  }

  $index = Get-Content -LiteralPath $indexPath -Raw
  if ($index -match '(?:src|href)=["'']/') {
    throw "index.html contains an absolute asset path, which will fail on itch.io's CDN."
  }
  if ($index -match 'https?://') {
    throw "index.html contains an external network dependency."
  }

  Add-Type -AssemblyName System.Drawing
  $cover = [System.Drawing.Image]::FromFile($coverPath)
  $banner = [System.Drawing.Image]::FromFile($bannerPath)
  try {
    if ($cover.Width -ne 630 -or $cover.Height -ne 500) {
      throw "cover.png must be exactly 630x500."
    }
    if ($banner.Width -ne 960 -or $banner.Height -ne 240) {
      throw "banner.png must be exactly 960x240."
    }
  }
  finally {
    $cover.Dispose()
    $banner.Dispose()
  }

  Write-Output "Release verified: $($files.Count) files, $totalBytes extracted bytes, relative assets, no external dependency."
}
finally {
  if (Test-Path -LiteralPath $tempRoot) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force
  }
}
