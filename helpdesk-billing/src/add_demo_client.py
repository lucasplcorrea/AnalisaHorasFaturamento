import sys
import os

# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.database import db
from src.models.client import Client, TicketData
from src.main import create_app

app = create_app()
with app.app_context():
    # Adicionar mais um cliente de teste
    test_ticket = TicketData(
        ticket_id='TEST004',
        client_name='Novo Cliente Demo',
        subject='Demo de sincronização',
        technician='Técnico Demo',
        processing_month=10,
        processing_year=2025,
        total_service_time=1.0
    )
    db.session.add(test_ticket)
    db.session.commit()
    print('✅ Cliente de demo adicionado para teste!')