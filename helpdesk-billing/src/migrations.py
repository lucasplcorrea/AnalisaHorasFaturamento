"""
Sistema de migração de banco de dados para Helpdesk Billing
"""
import os
import sqlite3
import logging
from datetime import datetime
from flask import current_app
from src.database import db
from src.models.client import Client, TicketData

logger = logging.getLogger(__name__)

class DatabaseMigrator:
    """Classe responsável por gerenciar migrações do banco de dados"""
    
    def __init__(self, app=None):
        self.app = app
        
    def get_db_path(self):
        """Retorna o caminho do banco de dados"""
        if self.app:
            # Extrair caminho do DATABASE_URI
            db_uri = self.app.config.get('SQLALCHEMY_DATABASE_URI', '')
            if db_uri.startswith('sqlite:///'):
                return db_uri[10:]  # Remove 'sqlite:///'
        
        # Fallback para caminho padrão
        return os.path.join(os.path.dirname(__file__), '..', 'database', 'app.db')
    
    def check_database_version(self):
        """Verifica a versão atual do banco de dados"""
        try:
            db_path = self.get_db_path()
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Verificar se tabela de versão existe
            cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='db_version'
            """)
            
            if not cursor.fetchone():
                # Primeira execução - criar tabela de versão
                cursor.execute("""
                    CREATE TABLE db_version (
                        id INTEGER PRIMARY KEY,
                        version INTEGER NOT NULL,
                        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                cursor.execute("INSERT INTO db_version (version) VALUES (0)")
                conn.commit()
                conn.close()
                return 0
            
            # Obter versão atual
            cursor.execute("SELECT version FROM db_version ORDER BY id DESC LIMIT 1")
            result = cursor.fetchone()
            conn.close()
            
            return result[0] if result else 0
            
        except Exception as e:
            logger.error(f"Erro ao verificar versão do banco: {e}")
            return 0
    
    def get_table_columns(self, table_name):
        """Lista as colunas existentes em uma tabela"""
        try:
            db_path = self.get_db_path()
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = [row[1] for row in cursor.fetchall()]
            conn.close()
            
            return columns
            
        except Exception as e:
            logger.error(f"Erro ao obter colunas da tabela {table_name}: {e}")
            return []
    
    def migration_001_add_client_fields(self):
        """Migração 001: Adicionar novos campos na tabela clients"""
        try:
            db_path = self.get_db_path()
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Verificar quais colunas já existem
            existing_columns = self.get_table_columns('clients')
            
            new_columns = [
                ('email', 'VARCHAR(255)'),
                ('phone', 'VARCHAR(50)'),
                ('address', 'TEXT'),
                ('notes', 'TEXT'),
                ('active', 'BOOLEAN DEFAULT 1')
            ]
            
            # Adicionar colunas que não existem
            for column_name, column_type in new_columns:
                if column_name not in existing_columns:
                    cursor.execute(f"ALTER TABLE clients ADD COLUMN {column_name} {column_type}")
                    logger.info(f"Adicionada coluna {column_name} na tabela clients")
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            logger.error(f"Erro na migração 001: {e}")
            return False
    
    def migration_002_add_indexes(self):
        """Migração 002: Adicionar índices para melhorar performance"""
        try:
            db_path = self.get_db_path()
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Índices para a tabela ticket_data
            indexes = [
                "CREATE INDEX IF NOT EXISTS idx_ticket_data_client_name ON ticket_data(client_name)",
                "CREATE INDEX IF NOT EXISTS idx_ticket_data_processing_period ON ticket_data(processing_year, processing_month)",
                "CREATE INDEX IF NOT EXISTS idx_ticket_data_technician ON ticket_data(technician)",
                "CREATE INDEX IF NOT EXISTS idx_ticket_data_completion_date ON ticket_data(completion_date)",
                "CREATE INDEX IF NOT EXISTS idx_ticket_data_external_service ON ticket_data(external_service)",
                
                # Índices para a tabela clients  
                "CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name)",
                "CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(active)"
            ]
            
            for index_sql in indexes:
                cursor.execute(index_sql)
                logger.info(f"Índice criado: {index_sql.split('idx_')[1].split(' ON')[0] if 'idx_' in index_sql else 'índice'}")
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            logger.error(f"Erro na migração 002: {e}")
            return False
    
    def migration_003_create_technicians_table(self):
        """Migração 003: Criar tabela de técnicos"""
        try:
            db_path = self.get_db_path()
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Verificar se a tabela já existe
            cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='technicians'
            """)
            
            if not cursor.fetchone():
                # Criar tabela de técnicos
                cursor.execute("""
                    CREATE TABLE technicians (
                        id INTEGER PRIMARY KEY,
                        name VARCHAR(255) NOT NULL UNIQUE,
                        email VARCHAR(255),
                        phone VARCHAR(50),
                        department VARCHAR(100),
                        monthly_hours_target FLOAT DEFAULT 160.0,
                        efficiency_target FLOAT DEFAULT 85.0,
                        active BOOLEAN DEFAULT 1,
                        hire_date DATETIME,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                logger.info("Tabela technicians criada")
                
                # Criar índices para a tabela technicians
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_technicians_name ON technicians(name)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_technicians_active ON technicians(active)")
                
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            logger.error(f"Erro na migração 003: {e}")
            return False
    
    def migration_004_add_upload_batch_id(self):
        """Migração 004: Adicionar upload_batch_id na tabela ticket_data"""
        try:
            db_path = self.get_db_path()
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Verificar se a coluna já existe
            existing_columns = self.get_table_columns('ticket_data')
            
            if 'upload_batch_id' not in existing_columns:
                cursor.execute("ALTER TABLE ticket_data ADD COLUMN upload_batch_id VARCHAR(50)")
                logger.info("✅ Coluna upload_batch_id adicionada à tabela ticket_data")
            else:
                logger.info("ℹ️ Coluna upload_batch_id já existe na tabela ticket_data")
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro na migração 004: {e}")
            return False
    
    def migration_005_add_whatsapp_contact(self):
        """Migração 005: Adicionar whatsapp_contact na tabela clients"""
        try:
            db_path = self.get_db_path()
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Verificar se a coluna já existe
            existing_columns = self.get_table_columns('clients')
            
            if 'whatsapp_contact' not in existing_columns:
                cursor.execute("ALTER TABLE clients ADD COLUMN whatsapp_contact VARCHAR(255)")
                logger.info("✅ Coluna whatsapp_contact adicionada à tabela clients")
            else:
                logger.info("ℹ️ Coluna whatsapp_contact já existe na tabela clients")
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro na migração 005: {e}")
            return False
    
    def update_version(self, new_version):
        """Atualiza a versão do banco de dados"""
        try:
            db_path = self.get_db_path()
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            cursor.execute("INSERT INTO db_version (version) VALUES (?)", (new_version,))
            conn.commit()
            conn.close()
            
            logger.info(f"Banco atualizado para versão {new_version}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao atualizar versão do banco: {e}")
            return False
    
    def run_migrations(self):
        """Executa todas as migrações necessárias"""
        current_version = self.check_database_version()
        logger.info(f"Versão atual do banco: {current_version}")
        
        migrations = [
            (1, self.migration_001_add_client_fields, "Adicionar campos email, phone, address, notes, active na tabela clients"),
            (2, self.migration_002_add_indexes, "Adicionar índices para melhorar performance das consultas"),
            (3, self.migration_003_create_technicians_table, "Criar tabela de técnicos"),
            (4, self.migration_004_add_upload_batch_id, "Adicionar upload_batch_id na tabela ticket_data"),
            (5, self.migration_005_add_whatsapp_contact, "Adicionar whatsapp_contact na tabela clients")
        ]
        
        for version, migration_func, description in migrations:
            if current_version < version:
                logger.info(f"Executando migração {version}: {description}")
                if migration_func():
                    self.update_version(version)
                    logger.info(f"Migração {version} concluída com sucesso")
                else:
                    logger.error(f"Falha na migração {version}")
                    return False
        
        logger.info("Todas as migrações foram executadas com sucesso")
        return True
    
    def backup_database(self):
        """Cria backup do banco antes das migrações"""
        try:
            db_path = self.get_db_path()
            if not os.path.exists(db_path):
                return True  # Não há banco para fazer backup
            
            backup_path = f"{db_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # Copiar arquivo
            with open(db_path, 'rb') as source:
                with open(backup_path, 'wb') as backup:
                    backup.write(source.read())
            
            logger.info(f"Backup criado: {backup_path}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao criar backup: {e}")
            return False

def migrate_database(app):
    """Função principal para executar migrações"""
    migrator = DatabaseMigrator(app)
    
    # Verificar se há migrações pendentes
    current_version = migrator.check_database_version()
    if current_version < 5:  # Temos migrações até versão 5
        # Só fazer backup se há migrações pendentes
        migrator.backup_database()
        # Executar migrações
        return migrator.run_migrations()
    else:
        # Não há migrações pendentes
        return True