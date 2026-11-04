$ErrorActionPreference = "Stop"
$source = Join-Path $PSScriptRoot "overlay"
$target = (Get-Location).Path
if (-not (Test-Path (Join-Path $target "app.json")) -or -not (Test-Path (Join-Path $target "api\package.json"))) { throw "Open PowerShell in your Mentorship+ project root (the folder containing app.json and api\package.json)." }
Get-ChildItem -Path $source -File -Recurse | ForEach-Object {
  $relative = $_.FullName.Substring($source.Length).TrimStart('\','/')
  $destination = Join-Path $target $relative
  $parent = Split-Path $destination -Parent
  if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
  Copy-Item -LiteralPath $_.FullName -Destination $destination -Force
}
Write-Host "Mentorship+ patch files copied. Follow README.md for the required Prisma seed, build and restart steps." -ForegroundColor Green
