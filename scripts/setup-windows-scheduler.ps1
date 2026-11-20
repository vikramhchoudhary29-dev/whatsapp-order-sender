$projectRoot = Split-Path -Parent $PSScriptRoot
$runner = Join-Path $PSScriptRoot "run-reminder.ps1"
$appStarter = Join-Path $PSScriptRoot "start-app.ps1"
$powershell = (Get-Command powershell.exe).Source

$appAction = New-ScheduledTaskAction -Execute $powershell -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$appStarter`""
$morningAction = New-ScheduledTaskAction -Execute $powershell -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`" -Slot morning"
$eveningAction = New-ScheduledTaskAction -Execute $powershell -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`" -Slot evening"

$appTrigger = New-ScheduledTaskTrigger -Daily -At 7:00AM
$morningTrigger = New-ScheduledTaskTrigger -Daily -At 10:00AM
$eveningTrigger = New-ScheduledTaskTrigger -Daily -At 5:00PM

$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

Register-ScheduledTask -TaskName "WhatsApp Order Sender - Start App" -Action $appAction -Trigger $appTrigger -Settings $settings -Description "Starts the local WhatsApp Order Sender at 7:00 AM, or when Windows becomes available after that time." -Force
Register-ScheduledTask -TaskName "WhatsApp Order Reminder - Morning" -Action $morningAction -Trigger $morningTrigger -Settings $settings -Description "Sends WhatsApp Template 1 at 10:00 AM." -Force
Register-ScheduledTask -TaskName "WhatsApp Order Reminder - Evening" -Action $eveningAction -Trigger $eveningTrigger -Settings $settings -Description "Sends WhatsApp Template 2 at 5:00 PM." -Force

Write-Output "Created the 7:00 AM app-start task and reminder tasks for 10:00 AM and 5:00 PM."
