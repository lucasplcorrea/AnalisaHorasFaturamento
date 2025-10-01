# -*- coding: utf-8 -*-
import os
import sys

# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from src.database import db
from src.models.user import User
from src.models.client import Client, TicketData
from src.routes.user import user_bp
from src.routes.billing import billing_bp
from src.routes.reports import reports_bp

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
    
    db.init_app(app)

    # --- Registro dos Blueprints ---
    app.register_blueprint(user_bp, url_prefix='/api')
    app.register_blueprint(billing_bp, url_prefix='/api')
    app.register_blueprint(reports_bp, url_prefix='/api')

    # --- Servir Arquivos Estáticos (Frontend) ---
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve(path):
        static_folder = app.static_folder
        if path != "" and os.path.exists(os.path.join(static_folder, path)):
            return send_from_directory(static_folder, path)
        else:
            return send_from_directory(static_folder, 'index.html')

    return app

# --- Inicialização da Aplicação ---
app = create_app()

# Cria as tabelas do banco de dados dentro do contexto da aplicação
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

