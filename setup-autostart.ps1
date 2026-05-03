# Script para criar Scheduled Task que inicia Jarvis no boot
# Execute como ADMIN no PowerShell

$taskName = "Jarvis-Docker-Startup"
$scriptPath = "E:\claudecode\claudecode\jarvis-startup.bat"
$action = New-ScheduledTaskAction -Execute $scriptPath
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserID "NT AUTHORITY\SYSTEM" -RunLevel Highest

# Remover task anterior se existir
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

# Criar nova task
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName $taskName -Principal $principal -Description "Inicia Docker Desktop e Jarvis containers automaticamente no boot"

Write-Host "Task criada: $taskName"
Write-Host "O Jarvis será iniciado automaticamente no próximo boot"
Write-Host "Log: C:\Windows\Temp\jarvis-startup.log"
