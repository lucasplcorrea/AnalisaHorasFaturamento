from datetime import datetime
from src.database import db

class Technician(db.Model):
    __tablename__ = 'technicians'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False, unique=True)
    email = db.Column(db.String(255))
    phone = db.Column(db.String(50))
    department = db.Column(db.String(100))
    
    # Configurações de metas e indicadores
    monthly_hours_target = db.Column(db.Float, default=160.0)  # Meta de horas mensais
    efficiency_target = db.Column(db.Float, default=85.0)      # Meta de eficiência %
    
    # Status
    active = db.Column(db.Boolean, default=True)
    hire_date = db.Column(db.DateTime)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Technician {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'department': self.department,
            'monthly_hours_target': self.monthly_hours_target,
            'efficiency_target': self.efficiency_target,
            'active': self.active,
            'hire_date': self.hire_date.isoformat() if self.hire_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def get_monthly_stats(self, month, year):
        """Retorna estatísticas do técnico para um mês específico"""
        from src.models.client import TicketData
        
        # Buscar tickets do técnico no período
        tickets = TicketData.query.filter_by(
            technician=self.name,
            processing_month=month,
            processing_year=year
        ).all()
        
        if not tickets:
            return {
                'total_tickets': 0,
                'total_hours': 0.0,
                'external_services': 0,
                'clients_served': 0,
                'efficiency': 0.0,
                'target_achievement': 0.0
            }
        
        total_hours = sum(ticket.total_service_time or 0 for ticket in tickets)
        external_services = sum(1 for ticket in tickets if ticket.external_service)
        clients_served = len(set(ticket.client_name for ticket in tickets if ticket.client_name))
        
        # Calcular eficiência (horas trabalhadas / horas meta * 100)
        efficiency = (total_hours / self.monthly_hours_target * 100) if self.monthly_hours_target > 0 else 0
        
        # Alcance da meta
        target_achievement = min(100, (total_hours / self.monthly_hours_target * 100)) if self.monthly_hours_target > 0 else 0
        
        return {
            'total_tickets': len(tickets),
            'total_hours': round(total_hours, 2),
            'external_services': external_services,
            'clients_served': clients_served,
            'efficiency': round(efficiency, 2),
            'target_achievement': round(target_achievement, 2),
            'tickets': [ticket.to_dict() for ticket in tickets]
        }