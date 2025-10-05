from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta
from collections import defaultdict
from src.database import db
from src.models.client import TicketData

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/heatmap-data/<int:month>/<int:year>', methods=['GET'])
def get_heatmap_data(month, year):
    """Obter dados de heatmap de atendimentos por dia do mês"""
    try:
        # Buscar todos os tickets do período
        tickets = TicketData.query.filter(
            TicketData.processing_month == month,
            TicketData.processing_year == year
        ).all()
        
        if not tickets:
            return jsonify({'heatmap_data': [], 'total_tickets': 0})
        
        # Criar dicionário para contar atendimentos por dia
        daily_counts = defaultdict(int)
        daily_hours = defaultdict(float)
        daily_tickets = defaultdict(list)
        
        # Processar tickets
        for ticket in tickets:
            # Usar arrival_date como data principal, fallback para start_date
            date_field = ticket.arrival_date or ticket.start_date or ticket.created_at
            
            if date_field:
                day = date_field.day
                daily_counts[day] += 1
                
                # Adicionar horas trabalhadas
                if ticket.total_service_time:
                    daily_hours[day] += ticket.total_service_time
                
                # Guardar informações do ticket para detalhamento
                daily_tickets[day].append({
                    'ticket_id': ticket.ticket_id,
                    'client_name': ticket.client_name,
                    'technician': ticket.technician,
                    'total_service_time': ticket.total_service_time,
                    'date': date_field.isoformat() if date_field else None
                })
        
        # Criar lista de dados para todos os dias do mês
        days_in_month = (datetime(year, month + 1, 1) - timedelta(days=1)).day if month < 12 else 31
        if month == 12:
            days_in_month = (datetime(year + 1, 1, 1) - timedelta(days=1)).day
        
        heatmap_data = []
        for day in range(1, days_in_month + 1):
            # Verificar se é dia útil (seg-sex)
            date_obj = datetime(year, month, day)
            is_weekday = date_obj.weekday() < 5  # 0-4 são seg-sex
            
            heatmap_data.append({
                'day': day,
                'date': date_obj.isoformat(),
                'weekday': date_obj.strftime('%A'),
                'weekday_short': date_obj.strftime('%a'),
                'is_weekday': is_weekday,
                'ticket_count': daily_counts.get(day, 0),
                'total_hours': round(daily_hours.get(day, 0), 2),
                'tickets': daily_tickets.get(day, []),
                'intensity': min(daily_counts.get(day, 0), 10)  # Escala de 0-10 para cores
            })
        
        # Calcular estatísticas
        total_tickets = sum(daily_counts.values())
        total_hours = sum(daily_hours.values())
        max_tickets_per_day = max(daily_counts.values()) if daily_counts else 0
        avg_tickets_per_day = total_tickets / len([d for d in heatmap_data if d['is_weekday']]) if any(d['is_weekday'] for d in heatmap_data) else 0
        
        return jsonify({
            'heatmap_data': heatmap_data,
            'statistics': {
                'total_tickets': total_tickets,
                'total_hours': round(total_hours, 2),
                'max_tickets_per_day': max_tickets_per_day,
                'avg_tickets_per_day': round(avg_tickets_per_day, 2),
                'working_days': len([d for d in heatmap_data if d['is_weekday'] and d['ticket_count'] > 0])
            },
            'period': f"{month:02d}/{year}"
        })
        
    except Exception as e:
        return jsonify({'error': f'Erro interno do servidor: {str(e)}'}), 500

@analytics_bp.route('/technician-performance/<int:month>/<int:year>', methods=['GET'])
def get_technician_performance(month, year):
    """Obter dados de performance por técnico"""
    try:
        # Buscar tickets agrupados por técnico
        from sqlalchemy import func
        
        technician_stats = db.session.query(
            TicketData.technician,
            func.count(TicketData.id).label('ticket_count'),
            func.sum(TicketData.total_service_time).label('total_hours'),
            func.sum(db.case((TicketData.external_service == True, 1), else_=0)).label('external_services_count')
        ).filter(
            TicketData.processing_month == month,
            TicketData.processing_year == year,
            TicketData.technician.isnot(None)
        ).group_by(TicketData.technician).all()
        
        performance_data = []
        for stat in technician_stats:
            performance_data.append({
                'technician': stat.technician,
                'ticket_count': stat.ticket_count,
                'total_hours': round(stat.total_hours or 0, 2),
                'avg_hours_per_ticket': round((stat.total_hours or 0) / stat.ticket_count, 2) if stat.ticket_count > 0 else 0,
                'external_services_count': int(stat.external_services_count or 0)
            })
        
        # Ordenar por número de tickets (decrescente)
        performance_data.sort(key=lambda x: x['ticket_count'], reverse=True)
        
        return jsonify({
            'performance_data': performance_data,
            'period': f"{month:02d}/{year}"
        })
        
    except Exception as e:
        return jsonify({'error': f'Erro interno do servidor: {str(e)}'}), 500

@analytics_bp.route('/technician-details/<string:technician_name>/<int:month>/<int:year>', methods=['GET'])
def get_technician_details(technician_name, month, year):
    """Obter detalhes específicos de um técnico incluindo lista de tickets"""
    try:
        from urllib.parse import unquote
        
        # Decodificar o nome do técnico (caso tenha caracteres especiais)
        decoded_technician_name = unquote(technician_name)
        
        # Buscar tickets específicos do técnico
        tickets = TicketData.query.filter(
            TicketData.processing_month == month,
            TicketData.processing_year == year,
            TicketData.technician == decoded_technician_name
        ).order_by(TicketData.created_at.desc()).all()
        
        # Calcular estatísticas resumidas
        ticket_count = len(tickets)
        total_hours = sum(ticket.total_service_time or 0 for ticket in tickets)
        avg_hours_per_ticket = total_hours / ticket_count if ticket_count > 0 else 0
        external_services_count = sum(1 for ticket in tickets if ticket.external_service == True)
        
        # Converter tickets para JSON
        tickets_data = []
        for ticket in tickets:
            tickets_data.append({
                'ticket_id': ticket.ticket_id,
                'client_name': ticket.client_name,
                'subject': ticket.subject,
                'total_service_time': ticket.total_service_time or 0,
                'status': ticket.status,
                'external_service': ticket.external_service or False,
                'created_at': ticket.created_at.isoformat() if ticket.created_at else None,
                'priority': getattr(ticket, 'priority', None),
                'category': getattr(ticket, 'category', None)
            })
        
        return jsonify({
            'technician': decoded_technician_name,
            'period': f"{month:02d}/{year}",
            'summary': {
                'ticket_count': ticket_count,
                'total_hours': round(total_hours, 2),
                'avg_hours_per_ticket': round(avg_hours_per_ticket, 2),
                'external_services_count': external_services_count
            },
            'tickets': tickets_data
        })
        
    except Exception as e:
        return jsonify({'error': f'Erro interno do servidor: {str(e)}'}), 500