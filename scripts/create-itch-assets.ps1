$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$assetPath = Join-Path $projectRoot "itch-assets"
New-Item -ItemType Directory -Force -Path $assetPath | Out-Null

function New-BrandImage {
  param(
    [Parameter(Mandatory = $true)][int]$Width,
    [Parameter(Mandatory = $true)][int]$Height,
    [Parameter(Mandatory = $true)][string]$OutputPath,
    [Parameter(Mandatory = $true)][bool]$Compact
  )

  $bitmap = New-Object System.Drawing.Bitmap($Width, $Height)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $ink = [System.Drawing.ColorTranslator]::FromHtml("#18181b")
  $panel = [System.Drawing.ColorTranslator]::FromHtml("#27272a")
  $paper = [System.Drawing.ColorTranslator]::FromHtml("#ffffff")
  $gold = [System.Drawing.ColorTranslator]::FromHtml("#eab308")
  $coral = [System.Drawing.ColorTranslator]::FromHtml("#facc15")
  $grid = [System.Drawing.Color]::FromArgb(16, 245, 238, 223)

  $graphics.Clear($ink)
  $gridPen = New-Object System.Drawing.Pen($grid, 1)
  for ($x = 0; $x -lt $Width; $x += 32) { $graphics.DrawLine($gridPen, $x, 0, $x, $Height) }
  for ($y = 0; $y -lt $Height; $y += 32) { $graphics.DrawLine($gridPen, 0, $y, $Width, $y) }

  $panelBrush = New-Object System.Drawing.SolidBrush($panel)
  $paperBrush = New-Object System.Drawing.SolidBrush($paper)
  $goldBrush = New-Object System.Drawing.SolidBrush($gold)
  $coralBrush = New-Object System.Drawing.SolidBrush($coral)
  $inkBrush = New-Object System.Drawing.SolidBrush($ink)
  $goldPen = New-Object System.Drawing.Pen($gold, 4)
  $paperPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(70, 245, 238, 223), 2)

  if ($Compact) {
    $titleFont = New-Object System.Drawing.Font("Arial Black", 48, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $smallFont = New-Object System.Drawing.Font("Arial", 17, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $numberFont = New-Object System.Drawing.Font("Arial Black", 34, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)

    $graphics.FillRectangle($goldBrush, 703, 34, 202, 112)
    $graphics.DrawString("743", $numberFont, $inkBrush, 770, 67)
    $graphics.DrawString("LAST SUM", $titleFont, $paperBrush, 46, 34)
    $graphics.DrawString("STANDING", $titleFont, $goldBrush, 46, 91)
    $graphics.DrawString("SIX NUMBERS  /  ONE TARGET  /  45 SECONDS", $smallFont, $paperBrush, 49, 173)

    $tileX = 714
    foreach ($value in @(100, 50, 25, 8)) {
      $graphics.FillRectangle($panelBrush, $tileX, 166, 48, 48)
      $graphics.DrawRectangle($paperPen, $tileX, 166, 48, 48)
      $graphics.DrawString([string]$value, $smallFont, $paperBrush, $tileX + 6, 180)
      $tileX += 54
    }
  }
  else {
    $titleFont = New-Object System.Drawing.Font("Arial Black", 58, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $smallFont = New-Object System.Drawing.Font("Arial", 16, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $tileFont = New-Object System.Drawing.Font("Arial Black", 21, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $targetFont = New-Object System.Drawing.Font("Arial Black", 60, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)

    $graphics.DrawString("LAST SUM", $titleFont, $paperBrush, 38, 34)
    $graphics.DrawString("STANDING", $titleFont, $goldBrush, 38, 96)
    $graphics.DrawString("A 45-SECOND ARITHMETIC ROGUELIKE", $smallFont, $paperBrush, 43, 173)

    $graphics.FillRectangle($goldBrush, 410, 40, 174, 124)
    $graphics.DrawString("743", $targetFont, $inkBrush, 427, 66)

    $tileX = 43
    foreach ($value in @(100, 50, 25, 75, 9, 8)) {
      $graphics.FillRectangle($panelBrush, $tileX, 242, 78, 72)
      $graphics.DrawRectangle($paperPen, $tileX, 242, 78, 72)
      $offset = if ($value -ge 100) { 12 } elseif ($value -ge 10) { 22 } else { 31 }
      $graphics.DrawString([string]$value, $tileFont, $paperBrush, $tileX + $offset, 263)
      $tileX += 88
    }

    $operatorX = 94
    foreach ($symbol in @("+", [char]0x2212, [char]0x00D7, [char]0x00F7)) {
      $graphics.FillEllipse($panelBrush, $operatorX, 345, 54, 54)
      $graphics.DrawEllipse($goldPen, $operatorX, 345, 54, 54)
      $graphics.DrawString([string]$symbol, $tileFont, $paperBrush, $operatorX + 16, 358)
      $operatorX += 130
    }

    $graphics.FillRectangle($coralBrush, 43, 439, 544, 4)
    $graphics.DrawString("DO THE ARITHMETIC BEFORE IT DOES YOU.", $smallFont, $paperBrush, 147, 458)
  }

  $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)

  foreach ($resource in @($gridPen, $panelBrush, $paperBrush, $goldBrush, $coralBrush, $inkBrush, $goldPen, $paperPen, $titleFont, $smallFont)) {
    if ($null -ne $resource) { $resource.Dispose() }
  }
  if ($null -ne $tileFont) { $tileFont.Dispose() }
  if ($null -ne $targetFont) { $targetFont.Dispose() }
  if ($null -ne $numberFont) { $numberFont.Dispose() }
  $graphics.Dispose()
  $bitmap.Dispose()
}

New-BrandImage -Width 630 -Height 500 -OutputPath (Join-Path $assetPath "cover.png") -Compact $false
New-BrandImage -Width 960 -Height 240 -OutputPath (Join-Path $assetPath "banner.png") -Compact $true

Write-Output (Join-Path $assetPath "cover.png")
Write-Output (Join-Path $assetPath "banner.png")
