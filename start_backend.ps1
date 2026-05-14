# Inicia o backend do Tago's CharCreator
Set-Location $PSScriptRoot
$env:PYTHONPATH = $PSScriptRoot
.\backend\venv\Scripts\Activate.ps1
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
