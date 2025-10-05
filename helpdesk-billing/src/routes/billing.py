from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
import os
from datetime import datetime
from src.services.data_processor import DataProcessor, BillingCalculator
from src.models.client import Client, TicketData
from src.database import db

billing_bp = Blueprint('billing', __name__)

# Configurações de upload
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'xlsx', 'xls'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def ensure_upload_folder():
    """Garante que a pasta de upload existe"""
    upload_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), UPLOAD_FOLDER)
    if not os.path.exists(upload_path):
        os.makedirs(upload_path)
    return upload_path

@billing_bp.route('/upload', methods=['POST'])
def upload_file():
    """Endpoint para upload e processamento do arquivo Excel"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'Nenhum arquivo foi enviado'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'Nenhum arquivo foi selecionado'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Tipo de arquivo não permitido. Use apenas .xlsx ou .xls'}), 400
        
        # Salvar arquivo
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{timestamp}_{filename}"
        
        upload_path = ensure_upload_folder()
        file_path = os.path.join(upload_path, filename)
        file.save(file_path)
        
        # Processar dados
        processor = DataProcessor()
        
        # Obter mês e ano dos parâmetros (opcional)
        month = request.form.get('month', type=int)
        year = request.form.get('year', type=int)
        
        result = processor.process_excel_file(file_path, month, year)
        
        # Remover arquivo após processamento
        try:
            os.remove(file_path)
        except:
            pass
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': f'Erro interno do servidor: {str(e)}'}), 500

@billing_bp.route('/clients', methods=['GET'])
def get_clients():
    """Retorna lista de todos os clientes"""
    try:
        clients = db.session.query(Client).all()
        return jsonify([client.to_dict() for client in clients])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@billing_bp.route('/clients/<int:client_id>', methods=['GET'])
def get_client(client_id):
    """Retorna dados de um cliente específico"""
    try:
        client = db.session.query(Client).get_or_404(client_id)

        return jsonify(client.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@billing_bp.route('/clients/<int:client_id>', methods=['PUT'])
def update_client(client_id):
    """Atualiza dados de um cliente"""
    try:
        client = db.session.query(Client).get_or_404(client_id)



        data = request.get_json()
        
        # Atualizar campos permitidos
        allowed_fields = ['name', 'contact', 'sector', 'email', 'phone', 'whatsapp_contact', 
                         'address', 'notes', 'active', 'contract_hours', 
                         'hourly_rate', 'overtime_rate', 'external_service_rate']
        
        for field in allowed_fields:
            if field in data:
                setattr(client, field, data[field])
        
        client.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify(client.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@billing_bp.route('/billing/<string:client_name>/<int:month>/<int:year>', methods=['GET'])
def get_client_billing(client_name, month, year):
    """Retorna o faturamento de um cliente específico para um período"""
    try:
        calculator = BillingCalculator()
        billing_data = calculator.calculate_client_billing(client_name, month, year)
        
        if 'error' in billing_data:
            return jsonify(billing_data), 404
        
        return jsonify(billing_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@billing_bp.route('/billing/<int:month>/<int:year>', methods=['GET'])
def get_all_billing(month, year):
    """Retorna o faturamento de todos os clientes para um período"""
    try:
        calculator = BillingCalculator()
        billing_data = calculator.calculate_all_clients_billing(month, year)
        
        return jsonify({
            'month': month,
            'year': year,
            'clients': billing_data,
            'summary': {
                'total_clients': len(billing_data),
                'total_value': sum(client['total_value'] for client in billing_data),
                'total_hours': sum(client['total_hours'] for client in billing_data),
                'total_overtime_hours': sum(client['overtime_hours'] for client in billing_data),
                'total_external_services': sum(client['external_services'] for client in billing_data)
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@billing_bp.route('/statistics/<int:month>/<int:year>', methods=['GET'])
def get_statistics(month, year):
    """Retorna estatísticas gerais para um período"""
    try:
        # Buscar dados do período
        tickets = db.session.query(TicketData).filter_by(
            processing_month=month,
            processing_year=year
        ).all()
        
        if not tickets:
            return jsonify({'error': 'Nenhum dado encontrado para o período especificado'}), 404
        
        # Calcular estatísticas
        stats = {
            'period': {'month': month, 'year': year},
            'general': {
                'total_tickets': len(tickets),
                'unique_clients': len(set(ticket.client_name for ticket in tickets)),
                'unique_technicians': len(set(ticket.technician for ticket in tickets if ticket.technician)),
                'total_hours': sum(ticket.total_service_time for ticket in tickets),
                'total_external_services': sum(1 for ticket in tickets if ticket.external_service)
            }
        }
        
        # Horas por cliente
        client_hours = {}
        for ticket in tickets:
            if ticket.client_name:
                client_hours[ticket.client_name] = client_hours.get(ticket.client_name, 0) + ticket.total_service_time
        stats['hours_by_client'] = client_hours
        
        # Horas por técnico
        technician_hours = {}
        for ticket in tickets:
            if ticket.technician:
                technician_hours[ticket.technician] = technician_hours.get(ticket.technician, 0) + ticket.total_service_time
        stats['hours_by_technician'] = technician_hours
        
        # Atendimentos externos por técnico
        external_by_tech = {}
        for ticket in tickets:
            if ticket.technician and ticket.external_service:
                external_by_tech[ticket.technician] = external_by_tech.get(ticket.technician, 0) + 1
        stats['external_services_by_technician'] = external_by_tech
        
        # Tickets por técnico
        tickets_by_tech = {}
        for ticket in tickets:
            if ticket.technician:
                tickets_by_tech[ticket.technician] = tickets_by_tech.get(ticket.technician, 0) + 1
        stats['tickets_by_technician'] = tickets_by_tech
        
        # Clientes únicos por técnico
        clients_by_tech = {}
        for ticket in tickets:
            if ticket.technician:
                if ticket.technician not in clients_by_tech:
                    clients_by_tech[ticket.technician] = set()
                clients_by_tech[ticket.technician].add(ticket.client_name)
        
        # Converter sets para contagem
        unique_clients_by_tech = {tech: len(clients) for tech, clients in clients_by_tech.items()}
        stats['unique_clients_by_technician'] = unique_clients_by_tech
        
        # Categorias mais comuns
        primary_categories = {}
        secondary_categories = {}
        for ticket in tickets:
            if ticket.primary_category:
                primary_categories[ticket.primary_category] = primary_categories.get(ticket.primary_category, 0) + 1
            if ticket.secondary_category:
                secondary_categories[ticket.secondary_category] = secondary_categories.get(ticket.secondary_category, 0) + 1
        
        stats['primary_categories'] = primary_categories
        stats['secondary_categories'] = secondary_categories
        
        return jsonify(stats)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@billing_bp.route('/periods', methods=['GET'])
def get_available_periods():
    """Retorna os períodos disponíveis nos dados"""
    try:
        periods = db.session.query(
            TicketData.processing_month,
            TicketData.processing_year
        ).distinct().order_by(
            TicketData.processing_year.desc(),
            TicketData.processing_month.desc()
        ).all()
        
        return jsonify([
            {
                'month': month,
                'year': year,
                'label': f"{month:02d}/{year}"
            }
            for month, year in periods
        ])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@billing_bp.route('/tickets/<int:month>/<int:year>', methods=['GET'])
def get_tickets(month, year):
    """Retorna todos os tickets de um período"""
    try:
        tickets = db.session.query(TicketData).filter_by(
            processing_month=month,
            processing_year=year
        ).all()
        
        return jsonify([ticket.to_dict() for ticket in tickets])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
