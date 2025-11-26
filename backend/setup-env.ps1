# Script para configurar variables de entorno en PowerShell
# Ejecutar: .\setup-env.ps1

$env:OPENAI_API_KEY = "<INTRODUCE_AQUI_TU_OPENAI_API_KEY>"
$env:LLM_MODEL = "gpt-5.1"
$env:LLM_TEMPERATURE = "0.3"
$env:DATABASE_URL = "postgresql://postgres:abc123@localhost:5433/cliint?schema=public"

Write-Host "✅ Variables de entorno configuradas:" -ForegroundColor Green
Write-Host "   OPENAI_API_KEY: $($env:OPENAI_API_KEY.Substring(0, 20))..." -ForegroundColor Gray
Write-Host "   LLM_MODEL: $env:LLM_MODEL" -ForegroundColor Gray
Write-Host "   LLM_TEMPERATURE: $env:LLM_TEMPERATURE" -ForegroundColor Gray
Write-Host "   DATABASE_URL: $env:DATABASE_URL" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  Nota: Estas variables solo están activas en esta sesión de PowerShell." -ForegroundColor Yellow
Write-Host "   Para hacerlas permanentes, añádelas a las Variables de Entorno del sistema." -ForegroundColor Yellow

