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
    # Adicionar alguns clientes fictícios nos ticket_data para testar
    # Primeiro, verificar se já existem
    existing = db.session.execute(text("SELECT COUNT(*) FROM ticket_data WHERE client_name = 'Cliente Teste 1'")).fetchone()[0]
    
    if existing == 0:
        print("Adicionando clientes de teste...")
        
        # Adicionar dados de teste
        test_tickets = [
            TicketData(
                ticket_id='TEST001',
                client_name='Cliente Teste 1',
                subject='Ticket de teste',
                technician='Técnico Teste',
                processing_month=10,
                processing_year=2025,
                total_service_time=2.5
            ),
            TicketData(
                ticket_id='TEST002',
                client_name='Cliente Teste 2',
                subject='Ticket de teste 2',
                technician='Técnico Teste',
                processing_month=10,
                processing_year=2025,
                total_service_time=1.5
            ),
            TicketData(
                ticket_id='TEST003',
                client_name='Cliente Teste 3',
                subject='Ticket de teste 3',
                technician='Técnico Teste',
                processing_month=10,
                processing_year=2025,
                total_service_time=3.0
            )
        ]
        
        for ticket in test_tickets:
            db.session.add(ticket)
        
        db.session.commit()
        print("✅ Clientes de teste adicionados!")
        
        # Verificar sync status
        from src.routes.auto_clients import check_sync_status
        print("Verificando status de sincronização após adição...")
        
    else:
        print("Clientes de teste já existem")
    
    # Verificar quantos clientes não sincronizados existem agora
    query = text("""
        SELECT COUNT(DISTINCT td.client_name)
        FROM ticket_data td
        LEFT JOIN clients c ON LOWER(TRIM(td.client_name)) = LOWER(TRIM(c.name))
        WHERE c.id IS NULL 
        AND td.client_name IS NOT NULL 
        AND TRIM(td.client_name) != ''
    """)
    result = db.session.execute(query).fetchone()
    print(f"Clientes não sincronizados: {result[0]}")
    
    # Buscar os nomes
    query = text("""
        SELECT DISTINCT td.client_name
        FROM ticket_data td
        LEFT JOIN clients c ON LOWER(TRIM(td.client_name)) = LOWER(TRIM(c.name))
        WHERE c.id IS NULL 
        AND td.client_name IS NOT NULL 
        AND TRIM(td.client_name) != ''
        ORDER BY td.client_name
    """)
    result = db.session.execute(query)
    clientes_nao_sincronizados = [row[0] for row in result.fetchall()]
    print(f"Nomes dos clientes não sincronizados: {clientes_nao_sincronizados}")