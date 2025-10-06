# -*- coding: utf-8 -*-
import os
import sys

# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory, jsonify
from src.database import db
from src.models.user import User
from src.models.client import Client, TicketData
from src.routes.user import user_bp
from src.routes.billing import billing_bp
from src.routes.reports import reports_bp
from src.routes.client import client_bp
from src.routes.technician import technician_bp
from src.routes.admin import admin_bp
from src.routes.analytics import analytics_bp
from src.routes.auto_clients import auto_clients_bp

def create_app():
    """Cria e configura a aplicação Flask."""
    app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
    app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT'

    # --- Configuração do Banco de Dados ---
    db_dir = os.path.join(os.path.dirname(__file__), 'database')
    os.makedirs(db_dir, exist_ok=True)  # Garante que o diretório do banco de dados exista
    db_path = os.path.join(db_dir, 'app.db')
    
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{db_path}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    
    # Configurações específicas do SQLite para performance
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
        'connect_args': {
            'timeout': 30,
            'check_same_thread': False
        }
    }
    
    db.init_app(app)

    # --- Registro dos Blueprints ---
    app.register_blueprint(user_bp, url_prefix='/api')
    app.register_blueprint(billing_bp, url_prefix='/api')
    app.register_blueprint(reports_bp, url_prefix='/api')
    app.register_blueprint(client_bp, url_prefix='/api')
    app.register_blueprint(technician_bp, url_prefix='/api')
    app.register_blueprint(admin_bp, url_prefix='/api')
    app.register_blueprint(analytics_bp, url_prefix='/api')
    app.register_blueprint(auto_clients_bp, url_prefix='/api')

    # --- Servir Arquivos Estáticos (Frontend) ---
    @app.route('/')
    def serve_index():
        return send_from_directory(app.static_folder, 'index.html')
    
    @app.route('/<path:path>')
    def serve(path):
        # Não interceptar rotas da API
        if path.startswith('api/'):
            return jsonify({'error': 'API endpoint not found'}), 404
            
        static_folder = app.static_folder
        if path != "" and os.path.exists(os.path.join(static_folder, path)):
            return send_from_directory(static_folder, path)
        else:
            return send_from_directory(static_folder, 'index.html')

    return app

# --- Inicialização da Aplicação ---
app = create_app()

# Cria as tabelas do banco de dados e executa migrações dentro do contexto da aplicação
with app.app_context():
    # Importar e executar migrações
    try:
        from src.migrations import migrate_database
        print("🔄 Verificando migrações do banco de dados...")
        if migrate_database(app):
            print("✅ Migrações executadas com sucesso")
        else:
            print("❌ Erro ao executar migrações")
    except Exception as e:
        print(f"⚠️ Erro nas migrações: {e}")
    
    # Criar tabelas (caso não existam)
    db.create_all()
    
    # Configurar SQLite para melhor performance
    try:
        if 'sqlite' in app.config['SQLALCHEMY_DATABASE_URI']:
            with db.engine.connect() as conn:
                # Configurações de performance para SQLite
                conn.execute(db.text("PRAGMA journal_mode=WAL"))  # Write-Ahead Logging
                conn.execute(db.text("PRAGMA synchronous=NORMAL"))  # Menos sincronização  
                conn.execute(db.text("PRAGMA cache_size=10000"))  # Cache maior
                conn.execute(db.text("PRAGMA temp_store=MEMORY"))  # Temp files em memória
                conn.execute(db.text("PRAGMA mmap_size=268435456"))  # Memory mapping 256MB
        print("⚡ Configurações de performance SQLite aplicadas")
    except Exception as e:
        print(f"⚠️ Erro ao configurar SQLite: {e}")
        
    print("📊 Banco de dados inicializado")

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

