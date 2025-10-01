from datetime import datetime
from src.database import db

class Client(db.Model):
    __tablename__ = 'clients'
    
    id = db.Column(db.Integer, primary_key=True)
    # Outras colunas Integer que podem ser anuláveis
    # Por exemplo, se houvesse outras colunas Integer que não fossem chaves primárias e pudessem receber NaN
    name = db.Column(db.String(255), nullable=False, unique=True)
    contact = db.Column(db.String(255))
    sector = db.Column(db.String(100))
    
    # Configurações do contrato
    contract_hours = db.Column(db.Float, default=10.0)  # Horas contratuais base
    hourly_rate = db.Column(db.Float, default=100.0)    # Valor da hora contratual
    overtime_rate = db.Column(db.Float, default=115.0)  # Valor da hora excedente
    external_service_rate = db.Column(db.Float, default=88.0)  # Valor do atendimento externo
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Client {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'contact': self.contact,
            'sector': self.sector,
            'contract_hours': self.contract_hours,
            'hourly_rate': self.hourly_rate,
            'overtime_rate': self.overtime_rate,
            'external_service_rate': self.external_service_rate,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class TicketData(db.Model):
    __tablename__ = 'ticket_data'
    
    id = db.Column(db.Integer, primary_key=True)
    # Outras colunas Integer que podem ser anuláveis
    # Por exemplo, se houvesse outras colunas Integer que não fossem chaves primárias e pudessem receber NaN
    ticket_id = db.Column(db.String(50), nullable=False)
    client_name = db.Column(db.String(255), nullable=False)
    subject = db.Column(db.Text, nullable=True)
    technician = db.Column(db.String(255), nullable=True)
    primary_category = db.Column(db.String(255), nullable=True)
    secondary_category = db.Column(db.String(255), nullable=True)
    contact = db.Column(db.String(255), nullable=True)
    arrival_date = db.Column(db.DateTime, nullable=True)
    departure_date = db.Column(db.DateTime, nullable=True)
    completion_date = db.Column(db.DateTime, nullable=True)

    workstation = db.Column(db.String(255), nullable=True)
    pause_reason = db.Column(db.Text, nullable=True)
    sector = db.Column(db.String(100), nullable=True)
    status = db.Column(db.String(50), nullable=True)
    ticket_type = db.Column(db.String(100), nullable=True)
    service = db.Column(db.Text, nullable=True)
    description = db.Column(db.Text, nullable=True)
    business_hours = db.Column(db.Boolean, nullable=True)
    external_service = db.Column(db.Boolean, nullable=True)
    start_date = db.Column(db.DateTime, nullable=True)
    end_date = db.Column(db.DateTime, nullable=True)

    total_service_time = db.Column(db.Float, nullable=True)  # Em horas
    
    # Referência ao mês/ano do processamento
    processing_month = db.Column(db.Integer, nullable=True)
    processing_year = db.Column(db.Integer, nullable=True)

    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=True)

    
    def __repr__(self):
        return f'<TicketData {self.ticket_id} - {self.client_name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'ticket_id': self.ticket_id,
            'client_name': self.client_name,
            'subject': self.subject,
            'technician': self.technician,
            'primary_category': self.primary_category,
            'secondary_category': self.secondary_category,
            'contact': self.contact,
            'arrival_date': self.arrival_date.isoformat() if self.arrival_date else None,
            'departure_date': self.departure_date.isoformat() if self.departure_date else None,
            'completion_date': self.completion_date.isoformat() if self.completion_date else None,
            'workstation': self.workstation,
            'pause_reason': self.pause_reason,
            'sector': self.sector,
            'status': self.status,
            'ticket_type': self.ticket_type,
            'service': self.service,
            'description': self.description,
            'business_hours': self.business_hours,
            'external_service': self.external_service,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'total_service_time': self.total_service_time,
            'processing_month': self.processing_month,
            'processing_year': self.processing_year,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
