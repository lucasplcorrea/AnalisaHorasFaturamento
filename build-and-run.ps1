# Script PowerShell para build e execução da aplicação
param(
    [switch]$SkipFrontend = $false,
    [switch]$NoBuild = $false
)

Write-Host "🚀 Iniciando build da aplicação Helpdesk Billing..." -ForegroundColor Green

# Verificar se Docker está rodando
try {
    docker info | Out-Null
} catch {
    Write-Host "❌ Docker não está rodando. Por favor, inicie o Docker e tente novamente." -ForegroundColor Red
    exit 1
}

if (-not $SkipFrontend) {
    # 1. Build do Frontend
    Write-Host "📦 Fazendo build do frontend React..." -ForegroundColor Cyan
    Set-Location "helpdesk-billing-frontend"

    if (-not (Test-Path "package.json")) {
        Write-Host "❌ package.json não encontrado. Certifique-se de estar no diretório correto." -ForegroundColor Red
        exit 1
    }

    # Instalar dependências se node_modules não existir
    if (-not (Test-Path "node_modules")) {
        Write-Host "📥 Instalando dependências do frontend..." -ForegroundColor Yellow
        if (Get-Command pnpm -ErrorAction SilentlyContinue) {
            pnpm install
        } else {
            npm install
        }
    }

    # Build do frontend
    Write-Host "🔨 Compilando aplicação React..." -ForegroundColor Yellow
    if (Get-Command pnpm -ErrorAction SilentlyContinue) {
        pnpm run build
    } else {
        npm run build
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Falha no build do frontend." -ForegroundColor Red
        exit 1
    }

    # 2. Copiar arquivos estáticos para o backend
    Write-Host "📂 Copiando arquivos estáticos para o backend..." -ForegroundColor Cyan
    Set-Location ".."
    
    # Limpar diretório static
    if (Test-Path "helpdesk-billing/src/static") {
        Remove-Item "helpdesk-billing/src/static/*" -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    # Copiar novos arquivos
    Copy-Item "helpdesk-billing-frontend/dist/*" "helpdesk-billing/src/static/" -Recurse -Force
}

if (-not $NoBuild) {
    # 3. Build e execução do Docker
    Write-Host "🐳 Fazendo build da imagem Docker..." -ForegroundColor Cyan
    docker-compose down 2>$null
    docker-compose build --no-cache

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Falha no build do Docker." -ForegroundColor Red
        exit 1
    }
}

# 4. Iniciar aplicação
Write-Host "🚀 Iniciando aplicação..." -ForegroundColor Cyan
docker-compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Aplicação iniciada com sucesso!" -ForegroundColor Green
    Write-Host "🌐 Acesse: http://localhost:5000" -ForegroundColor White
    Write-Host "📊 Logs: docker-compose logs -f" -ForegroundColor Gray
    Write-Host "🛑 Parar: docker-compose down" -ForegroundColor Gray
} else {
    Write-Host "❌ Falha ao iniciar a aplicação." -ForegroundColor Red
    exit 1
}