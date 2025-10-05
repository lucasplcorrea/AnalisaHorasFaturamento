# Use uma imagem Python slim
FROM python:3.11-slim

# Defina variáveis de ambiente
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=src/main.py
ENV FLASK_ENV=production

# Crie o diretório de trabalho
WORKDIR /app

# Instale dependências do sistema necessárias
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copie requirements e instale dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copie o código da aplicação
COPY src/ src/

# Crie diretórios necessários
RUN mkdir -p src/database src/uploads src/reports src/static

# Crie um volume para o banco de dados
VOLUME ["/app/src/database"]

# Exponha a porta
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/ || exit 1

# Comando para executar a aplicação
CMD ["python", "src/main.py"]