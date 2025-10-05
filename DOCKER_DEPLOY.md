# 🚀 Deploy com Docker - Guia Rápido

## Pré-requisitos
- Docker e Docker Compose instalados
- Node.js (para build do frontend)
- Git (para clonar o repositório)

## 🏃‍♂️ Execução Rápida

### Windows (PowerShell)
```powershell
# Executar com privilégios de administrador se necessário
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Build completo e execução
.\build-and-run.ps1

# Ou para pular o build do frontend (se já foi feito)
.\build-and-run.ps1 -SkipFrontend

# Ou para apenas reiniciar sem rebuild
.\build-and-run.ps1 -NoBuild
```

### Linux/macOS (Bash)
```bash
# Dar permissão de execução
chmod +x build-and-run.sh

# Build completo e execução
./build-and-run.sh
```

## 🐳 Comandos Docker Manuais

### Build e Execução
```bash
# 1. Build do frontend
cd helpdesk-billing-frontend
pnpm install && pnpm run build

# 2. Copiar para backend
cd ..
cp -r helpdesk-billing-frontend/dist/* helpdesk-billing/src/static/

# 3. Docker
docker-compose build
docker-compose up -d
```

### Gerenciamento
```bash
# Ver logs
docker-compose logs -f

# Parar aplicação
docker-compose down

# Reiniciar
docker-compose restart

# Rebuild completo
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 📁 Volumes e Persistência

A aplicação usa **volumes Docker** para persistir dados:

- `helpdesk_data`: Banco SQLite (`/app/src/database`)
- `helpdesk_uploads`: Arquivos enviados (`/app/src/uploads`)
- `helpdesk_reports`: PDFs gerados (`/app/src/reports`)

### Backup dos Dados
```bash
# Backup do banco de dados
docker run --rm -v helpdesk_data:/data -v $(pwd):/backup alpine tar czf /backup/backup-$(date +%Y%m%d).tar.gz /data

# Restaurar backup
docker run --rm -v helpdesk_data:/data -v $(pwd):/backup alpine tar xzf /backup/backup-20231201.tar.gz -C /
```

## 🔧 Variáveis de Ambiente

Você pode customizar a aplicação através do `docker-compose.yml`:

```yaml
environment:
  - FLASK_ENV=production  # ou development
  - SECRET_KEY=sua-chave-secreta-aqui
  - DATABASE_URL=sqlite:///app/src/database/app.db
```

## 🚀 Acesso à Aplicação

Após executar com sucesso:
- **URL**: http://localhost:5000
- **Interface**: Aplicação React servida pelo Flask
- **API**: http://localhost:5000/api/*

## 🔍 Troubleshooting

### Problemas Comuns

1. **Erro de permissão no Windows**:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. **Frontend não carrega**:
   - Certifique-se que o build foi copiado: `ls helpdesk-billing/src/static/`
   - Refaça o build: `.\build-and-run.ps1 -NoBuild`

3. **Porta 5000 já em uso**:
   - Altere a porta no `docker-compose.yml`: `"8080:5000"`

4. **Banco não persiste**:
   - Verifique os volumes: `docker volume ls | grep helpdesk`

### Logs de Debug
```bash
# Ver logs da aplicação
docker-compose logs helpdesk-billing

# Entrar no container
docker-compose exec helpdesk-billing bash

# Ver estrutura de arquivos
docker-compose exec helpdesk-billing ls -la src/
```

## 🔄 Migração para PostgreSQL (Futuro)

Quando necessário migrar para PostgreSQL:

1. Adicione o serviço no `docker-compose.yml`:
```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: helpdesk_billing
      POSTGRES_USER: helpdesk
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  helpdesk-billing:
    depends_on:
      - postgres
    environment:
      - DATABASE_URL=postgresql://helpdesk:secure_password@postgres:5432/helpdesk_billing
```

2. Atualize `requirements.txt`:
```
psycopg2-binary==2.9.7
```

3. Migre os dados com script personalizado.

Essa estrutura facilita a migração futura mantendo a simplicidade atual.