# Script para configurar variables de entorno en PowerShell
# Ejecutar: .\setup-env.ps1
# 
# IMPORTANTE: Reemplaza "your_openai_api_key_here" con tu clave real antes de ejecutar

$env:OPENAI_API_KEY = "your_openai_api_key_here"
$env:LLM_MODEL = "gpt-4o"
$env:LLM_TEMPERATURE = "0.4"

Write-Host "✅ Variables de entorno configuradas:" -ForegroundColor Green
Write-Host "   OPENAI_API_KEY: $($env:OPENAI_API_KEY.Substring(0, 20))..." -ForegroundColor Gray
Write-Host "   LLM_MODEL: $env:LLM_MODEL" -ForegroundColor Gray
Write-Host "   LLM_TEMPERATURE: $env:LLM_TEMPERATURE" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  Nota: Estas variables solo están activas en esta sesión de PowerShell." -ForegroundColor Yellow
Write-Host "   Para hacerlas permanentes, añádelas a las Variables de Entorno del sistema." -ForegroundColor Yellow

