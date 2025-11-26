# Copy this file to setup-env.ps1 (which is gitignored) and fill in your
# actual secrets/values locally. Never commit the real credentials.
param(
    [string]$OpenAIApiKey = "",
    [string]$LlmModel = "gpt-4.1",
    [double]$LlmTemperature = 0.3,
    [string]$DatabaseUrl = "postgresql://postgres:password@localhost:5433/cliint?schema=public"
)

function Resolve-SecretValue {
    param(
        [string]$CurrentValue,
        [string]$Prompt
    )

    if ([string]::IsNullOrWhiteSpace($CurrentValue)) {
        return Read-Host -Prompt $Prompt
    }

    return $CurrentValue
}

$env:OPENAI_API_KEY = Resolve-SecretValue -CurrentValue $OpenAIApiKey -Prompt "Enter OPENAI_API_KEY"
$env:LLM_MODEL = $LlmModel
$env:LLM_TEMPERATURE = $LlmTemperature
$env:DATABASE_URL = Resolve-SecretValue -CurrentValue $DatabaseUrl -Prompt "Enter DATABASE_URL"

Write-Host "✅ Variables de entorno configuradas (ejemplo):" -ForegroundColor Green
Write-Host ("   OPENAI_API_KEY: {0}..." -f $env:OPENAI_API_KEY.Substring(0, [Math]::Min(4, $env:OPENAI_API_KEY.Length))) -ForegroundColor Gray
Write-Host "   LLM_MODEL: $env:LLM_MODEL" -ForegroundColor Gray
Write-Host "   LLM_TEMPERATURE: $env:LLM_TEMPERATURE" -ForegroundColor Gray
Write-Host "   DATABASE_URL: $env:DATABASE_URL" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  Nota: personaliza setup-env.ps1 con tus credenciales locales y no lo subas al repositorio." -ForegroundColor Yellow

