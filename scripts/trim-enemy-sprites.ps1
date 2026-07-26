Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$assetDirectory = Join-Path (Split-Path $PSScriptRoot -Parent) "public/assets/enemies"
$padding = 8

Add-Type -AssemblyName System.Drawing

Get-ChildItem -LiteralPath $assetDirectory -Filter "*.png" | ForEach-Object {
  $source = [System.Drawing.Bitmap]::new($_.FullName)
  try {
    $minX = $source.Width
    $minY = $source.Height
    $maxX = -1
    $maxY = -1

    for ($y = 0; $y -lt $source.Height; $y++) {
      for ($x = 0; $x -lt $source.Width; $x++) {
        if ($source.GetPixel($x, $y).A -eq 0) { continue }
        $minX = [Math]::Min($minX, $x)
        $minY = [Math]::Min($minY, $y)
        $maxX = [Math]::Max($maxX, $x)
        $maxY = [Math]::Max($maxY, $y)
      }
    }

    if ($maxX -lt 0) {
      throw "Sprite $($_.Name) contains no visible pixels."
    }

    $left = [Math]::Max(0, $minX - $padding)
    $top = [Math]::Max(0, $minY - $padding)
    $right = [Math]::Min($source.Width - 1, $maxX + $padding)
    $bottom = [Math]::Min($source.Height - 1, $maxY + $padding)
    $crop = [System.Drawing.Rectangle]::new($left, $top, $right - $left + 1, $bottom - $top + 1)
    $trimmed = [System.Drawing.Bitmap]::new($crop.Width, $crop.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

    try {
      $graphics = [System.Drawing.Graphics]::FromImage($trimmed)
      try {
        $graphics.DrawImageUnscaled($source, -$crop.X, -$crop.Y)
      } finally {
        $graphics.Dispose()
      }

      $temporaryPath = "$($_.FullName).trim"
      try {
        $trimmed.Save($temporaryPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $source.Dispose()
        $source = $null
        [System.IO.File]::Copy($temporaryPath, $_.FullName, $true)
      } finally {
        Remove-Item -LiteralPath $temporaryPath -Force -ErrorAction SilentlyContinue
      }
    } finally {
      $trimmed.Dispose()
    }
  } finally {
    if ($null -ne $source) {
      $source.Dispose()
    }
  }
}
