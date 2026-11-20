param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("morning", "evening")]
  [string]$Slot
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot ".env"

if (-not (Test-Path -LiteralPath $envFile)) {
  throw "Missing .env. Copy .env.example and fill in CRON_SECRET first."
}

$secretLine = Get-Content -LiteralPath $envFile |
  Where-Object { $_ -match '^CRON_SECRET=' } |
  Select-Object -First 1

if (-not $secretLine) {
  throw "CRON_SECRET is missing from .env."
}

$secret = ($secretLine -replace '^CRON_SECRET=', '').Trim().Trim('"')
if (-not $secret) {
  throw "CRON_SECRET is empty."
}

Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:3000/api/cron/reminders?slot=$Slot" `
  -Headers @{ Authorization = "Bearer $secret" } `
  -ContentType "application/json"
