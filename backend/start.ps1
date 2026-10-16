$ErrorActionPreference = 'Stop'
$backendPython = Join-Path $PSScriptRoot '.venv/Scripts/python.exe'

if (-not (Test-Path -LiteralPath $backendPython)) {
    throw 'Backend environment missing. Follow the Windows setup in backend/README.md.'
}

$portCheck = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 8000)
try {
    $portCheck.Server.ExclusiveAddressUse = $true
    $portCheck.Start()
}
catch {
    Write-Host 'Cannot start: localhost:8000 is already in use or blocked by Windows.' -ForegroundColor Red
    Write-Host 'If the backend is running in another terminal, press Ctrl+C there, then run .\start.ps1 again.'
    Write-Host 'To identify the listener: Get-NetTCPConnection -LocalPort 8000 -State Listen | Select-Object OwningProcess'
    exit 1
}
finally {
    $portCheck.Stop()
}

Push-Location $PSScriptRoot
try {
    & $backendPython -m uvicorn app.main:app --reload
    $backendExitCode = $LASTEXITCODE
}
finally {
    Pop-Location
}
exit $backendExitCode
