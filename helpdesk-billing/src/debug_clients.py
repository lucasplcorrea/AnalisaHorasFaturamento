import sys
import os

# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.database import db
from src.models.client import Client, TicketData
from src.main import create_app
from sqlalchemy import text

app = create_app()

with app.app_context():
    # Contar clientes únicos nos ticket_data
    result = db.session.execute(text('SELECT COUNT(DISTINCT client_name) FROM ticket_data WHERE client_name IS NOT NULL'))
    total_unique_clients = result.fetchone()[0]
    print(f'Clientes únicos em ticket_data: {total_unique_clients}')
    
    # Contar clientes na tabela clients
    result = db.session.execute(text('SELECT COUNT(*) FROM clients'))
    total_registered_clients = result.fetchone()[0]
    print(f'Clientes na tabela clients: {total_registered_clients}')
    
    # Testar a query problemática
    query = text("""
        SELECT DISTINCT td.client_name
        FROM ticket_data td
        LEFT JOIN clients c ON LOWER(TRIM(td.client_name)) = LOWER(TRIM(c.name))
        WHERE c.id IS NULL 
        AND td.client_name IS NOT NULL 
        AND TRIM(td.client_name) != ''
        LIMIT 10
    """)
    result = db.session.execute(query)
    clientes_nao_cadastrados = [row[0] for row in result.fetchall()]
    print(f'Primeiros 10 clientes não cadastrados: {clientes_nao_cadastrados}')
    
    # Verificar se há clientes duplicados na comparação
    query = text("""
        SELECT td.client_name, c.name 
        FROM ticket_data td
        LEFT JOIN clients c ON LOWER(TRIM(td.client_name)) = LOWER(TRIM(c.name))
        WHERE td.client_name IS NOT NULL 
        LIMIT 5
    """)
    result = db.session.execute(query)
    comparacao = result.fetchall()
    print(f'Comparação de nomes (primeiros 5): {[(row[0], row[1]) for row in comparacao]}')