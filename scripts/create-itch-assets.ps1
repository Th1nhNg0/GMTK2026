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

function New-PromoImage {
  param(
    [Parameter(Mandatory = $true)][int]$Width,
    [Parameter(Mandatory = $true)][int]$Height,
    [Parameter(Mandatory = $true)][string]$OutputPath,
    [Parameter(Mandatory = $true)][bool]$Wide
  )

  $bitmap = New-Object System.Drawing.Bitmap($Width, $Height)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $ink = [System.Drawing.ColorTranslator]::FromHtml("#0f0f0d")
  $panel = [System.Drawing.ColorTranslator]::FromHtml("#1b1a17")
  $paper = [System.Drawing.ColorTranslator]::FromHtml("#e5dcc4")
  $gold = [System.Drawing.ColorTranslator]::FromHtml("#c6a75a")
  $coral = [System.Drawing.ColorTranslator]::FromHtml("#b9685f")
  $graphics.Clear($ink)
  $gridPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(20, 229, 220, 196), 1)
  for ($x = 0; $x -lt $Width; $x += 24) { $graphics.DrawLine($gridPen, $x, 0, $x, $Height) }
  for ($y = 0; $y -lt $Height; $y += 24) { $graphics.DrawLine($gridPen, 0, $y, $Width, $y) }
  $panelBrush = New-Object System.Drawing.SolidBrush($panel)
  $paperBrush = New-Object System.Drawing.SolidBrush($paper)
  $goldBrush = New-Object System.Drawing.SolidBrush($gold)
  $inkBrush = New-Object System.Drawing.SolidBrush($ink)
  $goldPen = New-Object System.Drawing.Pen($gold, 3)
  $paperPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(95, 229, 220, 196), 2)

  if ($Wide) {
    $titleFont = New-Object System.Drawing.Font("Courier New", 104, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $taglineFont = New-Object System.Drawing.Font("Tahoma", 24, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $copyFont = New-Object System.Drawing.Font("Courier New", 20, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $targetFont = New-Object System.Drawing.Font("Courier New", 112, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $tileFont = New-Object System.Drawing.Font("Courier New", 35, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $graphics.DrawString("LAST SUM", $titleFont, $paperBrush, 70, 92)
    $graphics.DrawString("STANDING", $titleFont, $goldBrush, 70, 208)
    $graphics.DrawString("A 45-SECOND ARITHMETIC ROGUELIKE", $taglineFont, $paperBrush, 76, 350)
    $graphics.DrawString("ONE TARGET. NO SECOND CHANCES.", $copyFont, $goldBrush, 76, 410)
    $graphics.FillRectangle($panelBrush, 1050, 70, 440, 264)
    $graphics.DrawRectangle($goldPen, 1050, 70, 440, 264)
    $graphics.DrawString("TARGET", $copyFont, $goldBrush, 1080, 95)
    $graphics.DrawString("743", $targetFont, $paperBrush, 1073, 142)
    $graphics.DrawString("T−45", $taglineFont, $goldBrush, 1335, 257)
    $tileX = 580
    foreach ($value in @(100, 50, 25, 8, 7, 3)) {
      $graphics.FillRectangle($panelBrush, $tileX, 500, 126, 104)
      $graphics.DrawRectangle($paperPen, $tileX, 500, 126, 104)
      $tileOffset = if ($value -ge 100) { 16 } elseif ($value -ge 10) { 29 } else { 47 }
      $graphics.DrawString([string]$value, $tileFont, $paperBrush, $tileX + $tileOffset, 533)
      $tileX += 142
    }
    $graphics.DrawLine($goldPen, 70, 650, 1610, 650)
  }
  else {
    $titleFont = New-Object System.Drawing.Font("Courier New", 66, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $taglineFont = New-Object System.Drawing.Font("Tahoma", 19, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $copyFont = New-Object System.Drawing.Font("Courier New", 17, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $targetFont = New-Object System.Drawing.Font("Courier New", 92, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $tileFont = New-Object System.Drawing.Font("Courier New", 30, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $graphics.DrawString("LAST SUM", $titleFont, $paperBrush, 58, 48)
    $graphics.DrawString("STANDING", $titleFont, $goldBrush, 58, 122)
    $graphics.DrawString("BUILD THE EQUATION BEFORE TIME RUNS OUT.", $taglineFont, $paperBrush, 62, 214)
    $graphics.FillRectangle($panelBrush, 790, 56, 350, 180)
    $graphics.DrawRectangle($goldPen, 790, 56, 350, 180)
    $graphics.DrawString("TARGET // 45 SEC", $copyFont, $goldBrush, 822, 80)
    $graphics.DrawString("743", $targetFont, $paperBrush, 825, 116)
    $tileX = 68
    foreach ($value in @(100, 50, 25, 8, 7, 3)) {
      $graphics.FillRectangle($panelBrush, $tileX, 322, 142, 100)
      $graphics.DrawRectangle($paperPen, $tileX, 322, 142, 100)
      $tileOffset = if ($value -ge 100) { 20 } elseif ($value -ge 10) { 35 } else { 54 }
      $graphics.DrawString([string]$value, $tileFont, $paperBrush, $tileX + $tileOffset, 355)
      $tileX += 178
    }
    $operatorX = 188
    foreach ($symbol in @("+", [char]0x2212, [char]0x00D7, [char]0x00F7)) {
      $graphics.DrawEllipse($goldPen, $operatorX, 478, 62, 62)
      $graphics.DrawString([string]$symbol, $tileFont, $goldBrush, $operatorX + 17, 491)
      $operatorX += 208
    }
    $graphics.DrawString("SIX NUMBERS  /  ONE TARGET  /  COUNTDOWN", $copyFont, $goldBrush, 250, 566)
  }

  $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $titleFont.Dispose()
  $taglineFont.Dispose()
  $copyFont.Dispose()
  $targetFont.Dispose()
  $tileFont.Dispose()
  foreach ($resource in @($gridPen, $panelBrush, $paperBrush, $goldBrush, $inkBrush, $goldPen, $paperPen)) { $resource.Dispose() }
  $graphics.Dispose()
  $bitmap.Dispose()
}

function New-BannerImage {
  param([Parameter(Mandatory = $true)][string]$OutputPath)

  $bitmap = New-Object System.Drawing.Bitmap(960, 240)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $ink = [System.Drawing.ColorTranslator]::FromHtml("#0f0f0d")
  $panel = [System.Drawing.ColorTranslator]::FromHtml("#1b1a17")
  $paper = [System.Drawing.ColorTranslator]::FromHtml("#e5dcc4")
  $gold = [System.Drawing.ColorTranslator]::FromHtml("#c6a75a")
  $graphics.Clear($ink)
  $gridPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(20, 229, 220, 196), 1)
  for ($x = 0; $x -lt 960; $x += 24) { $graphics.DrawLine($gridPen, $x, 0, $x, 240) }
  for ($y = 0; $y -lt 240; $y += 24) { $graphics.DrawLine($gridPen, 0, $y, 960, $y) }
  $paperBrush = New-Object System.Drawing.SolidBrush($paper)
  $goldBrush = New-Object System.Drawing.SolidBrush($gold)
  $inkBrush = New-Object System.Drawing.SolidBrush($ink)
  $panelBrush = New-Object System.Drawing.SolidBrush($panel)
  $goldPen = New-Object System.Drawing.Pen($gold, 2)
  $titleFont = New-Object System.Drawing.Font("Courier New", 46, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $smallFont = New-Object System.Drawing.Font("Courier New", 15, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $targetFont = New-Object System.Drawing.Font("Courier New", 42, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $timerFont = New-Object System.Drawing.Font("Courier New", 28, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)

  $graphics.DrawString("LAST SUM", $titleFont, $paperBrush, 42, 34)
  $graphics.DrawString("STANDING", $titleFont, $goldBrush, 42, 87)
  $graphics.DrawString("SIX NUMBERS // ONE TARGET // 45 SECONDS", $smallFont, $paperBrush, 46, 166)
  $graphics.DrawLine($goldPen, 42, 208, 918, 208)
  $graphics.FillRectangle($panelBrush, 671, 39, 166, 116)
  $graphics.DrawRectangle($goldPen, 671, 39, 166, 116)
  $graphics.DrawString("TARGET", $smallFont, $goldBrush, 690, 54)
  $graphics.DrawString("743", $targetFont, $paperBrush, 695, 83)
  $graphics.DrawString("T−45", $timerFont, $goldBrush, 852, 78)

  foreach ($resource in @($gridPen, $paperBrush, $goldBrush, $inkBrush, $panelBrush, $goldPen, $titleFont, $smallFont, $targetFont, $timerFont)) { $resource.Dispose() }
  $graphics.Dispose()
  $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
}

function New-FaviconImage {
  param(
    [Parameter(Mandatory = $true)][int]$Size,
    [Parameter(Mandatory = $true)][string]$OutputPath
  )

  $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $ink = [System.Drawing.ColorTranslator]::FromHtml("#18181b")
  $gold = [System.Drawing.ColorTranslator]::FromHtml("#eab308")
  $paper = [System.Drawing.ColorTranslator]::FromHtml("#ffffff")
  $grid = [System.Drawing.Color]::FromArgb(38, 255, 255, 255)
  $graphics.Clear($ink)
  $gridPen = New-Object System.Drawing.Pen($grid, 2)
  for ($x = 0; $x -le $Size; $x += 32) { $graphics.DrawLine($gridPen, $x, 0, $x, $Size) }
  for ($y = 0; $y -le $Size; $y += 32) { $graphics.DrawLine($gridPen, 0, $y, $Size, $y) }
  $goldPen = New-Object System.Drawing.Pen($gold, 16)
  $graphics.DrawEllipse($goldPen, 43, 43, $Size - 86, $Size - 86)
  $targetFont = New-Object System.Drawing.Font("Arial Black", 132, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $graphics.DrawString("743", $targetFont, (New-Object System.Drawing.SolidBrush($paper)), 73, 169)
  $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $targetFont.Dispose()
  $goldPen.Dispose()
  $gridPen.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

function New-LogoImage {
  param(
    [Parameter(Mandatory = $true)][string]$OutputPath
  )

  $bitmap = New-Object System.Drawing.Bitmap(1600, 560, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $paper = [System.Drawing.ColorTranslator]::FromHtml("#ffffff")
  $gold = [System.Drawing.ColorTranslator]::FromHtml("#eab308")
  $titleFont = New-Object System.Drawing.Font("Arial Black", 176, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $graphics.DrawString("LAST SUM", $titleFont, (New-Object System.Drawing.SolidBrush($paper)), 30, 15)
  $graphics.DrawString("STANDING", $titleFont, (New-Object System.Drawing.SolidBrush($gold)), 30, 218)
  $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $titleFont.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

New-BrandImage -Width 630 -Height 500 -OutputPath (Join-Path $assetPath "cover.png") -Compact $false
New-BannerImage -OutputPath (Join-Path $assetPath "banner.png")
$promoPath = Join-Path $assetPath "promo"
New-Item -ItemType Directory -Force -Path $promoPath | Out-Null
New-PromoImage -Width 1200 -Height 630 -OutputPath (Join-Path $promoPath "social-media.png") -Wide $false
New-PromoImage -Width 1680 -Height 720 -OutputPath (Join-Path $promoPath "wide-cover.png") -Wide $true
New-FaviconImage -Size 512 -OutputPath (Join-Path $promoPath "favicon.png")
New-LogoImage -OutputPath (Join-Path $promoPath "logo.png")

Write-Output (Join-Path $assetPath "cover.png")
Write-Output (Join-Path $assetPath "banner.png")
Write-Output (Join-Path $promoPath "social-media.png")
Write-Output (Join-Path $promoPath "wide-cover.png")
Write-Output (Join-Path $promoPath "favicon.png")
Write-Output (Join-Path $promoPath "logo.png")
