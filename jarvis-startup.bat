@echo off
REM Jarvis Docker Auto-Startup Script
REM Coloque em: C:\Users\[SEU_USUARIO]\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\

echo [%date% %time%] Iniciando Docker Desktop... >> %TEMP%\jarvis-startup.log

REM Inicia Docker Desktop
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

REM Aguarda Docker ficar pronto (máx 120 segundos)
setlocal enabledelayedexpansion
set count=0
:wait_docker
timeout /t 3 /nobreak >nul
docker ps >nul 2>&1
if errorlevel 1 (
    set /a count+=1
    if !count! lss 40 (
        goto wait_docker
    ) else (
        echo [%date% %time%] ERRO: Docker nao respondeu >> %TEMP%\jarvis-startup.log
        exit /b 1
    )
)

echo [%date% %time%] Docker online. Iniciando containers... >> %TEMP%\jarvis-startup.log
cd /d E:\claudecode\claudecode

REM Inicia todos os containers
docker compose up -d >>%TEMP%\jarvis-startup.log 2>&1

REM Aguarda containers iniciarem
timeout /t 10 /nobreak >nul

REM Aplica memory limits aos containers sem restricoes
echo [%date% %time%] Aplicando memory limits... >> %TEMP%\jarvis-startup.log
docker update --memory=512m --memory-swap=512m jarvis-agents-service-1 jarvis-core-service-1 jarvis-monitoring-service-1 jarvis-freshservice-service-1 jarvis-moneypenny-service-1 jarvis-expenses-service-1 jarvis-frontend-1 >>%TEMP%\jarvis-startup.log 2>&1
docker update --memory=256m --memory-swap=256m jarvis-monitor-agent-1 >>%TEMP%\jarvis-startup.log 2>&1

echo [%date% %time%] Startup completo >> %TEMP%\jarvis-startup.log
echo Jarvis iniciado automaticamente. Log em: %TEMP%\jarvis-startup.log
