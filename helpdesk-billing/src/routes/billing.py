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

@billing_bp.route('/billing/clients', methods=['GET'])
def get_clients():
    """Retorna lista de todos os clientes para faturamento"""
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

@billing_bp.route('/delete-period/<int:month>/<int:year>', methods=['DELETE'])
def delete_period(month, year):
    """Deleta todos os dados de um período específico"""
    try:
        # Verificar se o período existe
        record_count = TicketData.query.filter_by(
            processing_month=month,
            processing_year=year
        ).count()
        
        if record_count == 0:
            return jsonify({'error': f'Nenhum dado encontrado para {month:02d}/{year}'}), 404
        
        # Deletar registros
        deleted_count = TicketData.query.filter_by(
            processing_month=month,
            processing_year=year
        ).delete()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Período {month:02d}/{year} deletado com sucesso',
            'deleted_records': deleted_count
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro ao deletar período: {str(e)}'}), 500

@billing_bp.route('/periods', methods=['GET'])
def get_periods():
    """Retorna lista de períodos disponíveis"""
    try:
        # Debug: verificar quantos registros existem
        total_records = TicketData.query.count()
        print(f"DEBUG: Total de registros no banco: {total_records}")
        
        # Debug: verificar registros com período
        records_with_period = TicketData.query.filter(
            TicketData.processing_month.isnot(None),
            TicketData.processing_year.isnot(None)
        ).count()
        print(f"DEBUG: Registros com período definido: {records_with_period}")
        
        # Debug: mostrar alguns exemplos
        sample_records = TicketData.query.filter(
            TicketData.processing_month.isnot(None),
            TicketData.processing_year.isnot(None)
        ).limit(3).all()
        
        for record in sample_records:
            print(f"DEBUG: Exemplo - Month: {record.processing_month}, Year: {record.processing_year}, Client: {record.client_name}")
        
        periods_query = db.session.query(
            TicketData.processing_month,
            TicketData.processing_year,
            db.func.count(TicketData.id).label('total_tickets'),
            db.func.count(db.distinct(TicketData.client_name)).label('total_clients'),
            db.func.max(TicketData.created_at).label('last_update')
        ).filter(
            TicketData.processing_month.isnot(None),
            TicketData.processing_year.isnot(None)
        ).group_by(
            TicketData.processing_month,
            TicketData.processing_year
        ).order_by(
            TicketData.processing_year.desc(),
            TicketData.processing_month.desc()
        ).all()
        
        print(f"DEBUG: Períodos encontrados na query: {len(periods_query)}")
        
        periods_data = []
        for period in periods_query:
            print(f"DEBUG: Processando período {period.processing_month}/{period.processing_year} - Tickets: {period.total_tickets}, Clientes: {period.total_clients}")
            period_data = {
                'month': period.processing_month,
                'year': period.processing_year,
                'label': f"{period.processing_month:02d}/{period.processing_year}",
                'total_tickets': int(period.total_tickets) if period.total_tickets else 0,
                'total_clients': int(period.total_clients) if period.total_clients else 0,
                'last_update': period.last_update.isoformat() if period.last_update else None
            }
            periods_data.append(period_data)
            print(f"DEBUG: Período adicionado: {period_data}")
        
        print(f"DEBUG: Retornando {len(periods_data)} períodos")
        return jsonify(periods_data)
        
    except Exception as e:
        print(f"DEBUG: Erro na query de períodos: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Erro ao buscar períodos: {str(e)}'}), 500

@billing_bp.route('/upload-batches', methods=['GET'])
def get_upload_batches():
    """Retorna histórico de uploads realizados"""
    try:
        # Consultar dados de batches usando upload_batch_id
        batches_query = db.session.query(
            TicketData.upload_batch_id,
            db.func.count(TicketData.id).label('tickets_count'),
            TicketData.processing_month,
            TicketData.processing_year,
            db.func.max(TicketData.created_at).label('upload_date')
        ).filter(
            TicketData.upload_batch_id.isnot(None)
        ).group_by(
            TicketData.upload_batch_id,
            TicketData.processing_month,
            TicketData.processing_year
        ).order_by(
            db.func.max(TicketData.created_at).desc()
        ).all()
        
        batches_data = []
        for batch in batches_query:
            batches_data.append({
                'batch_id': batch.upload_batch_id,
                'filename': f'upload_{batch.upload_batch_id}.xlsx',
                'period': f"{batch.processing_month:02d}/{batch.processing_year}",
                'tickets_count': batch.tickets_count,
                'upload_date': batch.upload_date.isoformat() if batch.upload_date else None
            })
        
        return jsonify({'batches': batches_data})
        
    except Exception as e:
        return jsonify({'error': f'Erro ao buscar histórico de uploads: {str(e)}'}), 500

@billing_bp.route('/delete-batch/<batch_id>', methods=['DELETE'])
def delete_batch(batch_id):
    """Deleta um lote específico de upload"""
    try:
        # Verificar se o batch existe usando upload_batch_id
        record_count = TicketData.query.filter_by(upload_batch_id=batch_id).count()
        
        if record_count == 0:
            return jsonify({'error': 'Lote de upload não encontrado'}), 404
        
        # Deletar registros
        deleted_count = TicketData.query.filter_by(upload_batch_id=batch_id).delete()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Lote de upload deletado com sucesso',
            'deleted_records': deleted_count
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro ao deletar lote: {str(e)}'}), 500

@billing_bp.route('/system-info', methods=['GET'])
def get_system_info():
    """Retorna informações gerais do sistema"""
    try:
        # Estatísticas gerais
        total_tickets = TicketData.query.count()
        total_clients = Client.query.count()
        
        # Contar uploads únicos por upload_batch_id
        total_uploads = db.session.query(
            db.func.count(db.distinct(TicketData.upload_batch_id))
        ).filter(
            TicketData.upload_batch_id.isnot(None)
        ).scalar() or 0
        
        # Contar PDFs gerados na pasta de relatórios
        try:
            reports_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'reports')
            if os.path.exists(reports_dir):
                pdf_files = [f for f in os.listdir(reports_dir) if f.endswith('.pdf')]
                total_reports = len(pdf_files)
            else:
                total_reports = 0
        except:
            total_reports = 0
            
        # Tamanho do banco de dados (aproximado)
        try:
            db_path = current_app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', '')
            if os.path.exists(db_path):
                database_size = os.path.getsize(db_path)
            else:
                database_size = 0
        except:
            database_size = 0
        
        # Último backup (procurar por arquivos de backup)
        last_backup = None
        try:
            db_dir = os.path.dirname(db_path)
            backup_files = [f for f in os.listdir(db_dir) if f.startswith('app.db.backup_')]
            if backup_files:
                backup_files.sort(reverse=True)
                last_backup_file = os.path.join(db_dir, backup_files[0])
                last_backup = datetime.fromtimestamp(os.path.getmtime(last_backup_file)).isoformat()
        except:
            pass
        
        return jsonify({
            'system_info': {
                'total_tickets': total_tickets,
                'total_clients': total_clients,
                'total_uploads': total_uploads,
                'total_reports': total_reports,
                'database_size': database_size,
                'last_backup': last_backup
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'Erro ao buscar informações do sistema: {str(e)}'}), 500
