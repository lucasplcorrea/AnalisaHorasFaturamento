#!/bin/bash

echo "🚀 Iniciando build da aplicação Helpdesk Billing..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para imprimir com cor
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    print_error "Docker não está rodando. Por favor, inicie o Docker e tente novamente."
    exit 1
fi

# 1. Build do Frontend
print_status "📦 Fazendo build do frontend React..."
cd helpdesk-billing-frontend

if [ ! -f "package.json" ]; then
    print_error "package.json não encontrado. Certifique-se de estar no diretório correto."
    exit 1
fi

# Instalar dependências se node_modules não existir
if [ ! -d "node_modules" ]; then
    print_status "📥 Instalando dependências do frontend..."
    pnpm install || npm install
fi

# Build do frontend
print_status "🔨 Compilando aplicação React..."
pnpm run build || npm run build

if [ $? -ne 0 ]; then
    print_error "Falha no build do frontend."
    exit 1
fi

# 2. Copiar arquivos estáticos para o backend
print_status "📂 Copiando arquivos estáticos para o backend..."
cd ..
rm -rf helpdesk-billing/src/static/*
cp -r helpdesk-billing-frontend/dist/* helpdesk-billing/src/static/

# 3. Build e execução do Docker
print_status "🐳 Fazendo build da imagem Docker..."
docker-compose down 2>/dev/null
docker-compose build --no-cache

if [ $? -ne 0 ]; then
    print_error "Falha no build do Docker."
    exit 1
fi

# 4. Iniciar aplicação
print_status "🚀 Iniciando aplicação..."
docker-compose up -d

if [ $? -eq 0 ]; then
    print_status "✅ Aplicação iniciada com sucesso!"
    print_status "🌐 Acesse: http://localhost:5000"
    print_status "📊 Logs: docker-compose logs -f"
    print_status "🛑 Parar: docker-compose down"
else
    print_error "Falha ao iniciar a aplicação."
    exit 1
fi