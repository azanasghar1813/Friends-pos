Add-Type -AssemblyName System.Drawing

function Resize-Image($sourcePath, $targetPath, $width, $height) {
    $srcImg = [System.Drawing.Image]::FromFile($sourcePath)
    $bmp = New-Object System.Drawing.Bitmap $width, $height
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    # Fill background with dark theme color or transparent
    # Let's check: transparent background
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.DrawImage($srcImg, 0, 0, $width, $height)
    
    $bmp.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bmp.Dispose()
    $srcImg.Dispose()
    Write-Output "Created $targetPath ($($width)x$($height))"
}

$base = (Get-Item .).FullName
$src = Join-Path $base "frontend\public\logo2.png"
Resize-Image $src (Join-Path $base "frontend\public\pwa-192x192.png") 192 192
Resize-Image $src (Join-Path $base "frontend\public\pwa-512x512.png") 512 512
Resize-Image $src (Join-Path $base "frontend\public\apple-touch-icon.png") 180 180
Resize-Image $src (Join-Path $base "frontend\public\favicon.png") 64 64
