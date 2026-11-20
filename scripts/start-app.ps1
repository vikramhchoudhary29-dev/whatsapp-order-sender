$projectRoot = Split-Path -Parent $PSScriptRoot
$existingListener = Get-NetTCPConnection -LocalAddress '127.0.0.1' -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue

if ($existingListener) {
  Write-Output "The WhatsApp app is already running on port 3000."
  exit 0
}

$npm = (Get-Command npm.cmd).Source
Start-Process -FilePath $npm -ArgumentList 'run start' -WorkingDirectory $projectRoot -WindowStyle Hidden
Write-Output "Started the WhatsApp app in the background."
