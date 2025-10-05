from flask import Blueprint, request, jsonify
from src.models.client import TicketData
from src.database import db
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/admin/processed-periods', methods=['GET'])
def get_processed_periods():
    """Lista todos os períodos processados"""
    try:
        periods = db.session.query(
            TicketData.processing_month, 
            TicketData.processing_year,
            db.func.count(TicketData.id).label('record_count'),
            db.func.min(TicketData.created_at).label('first_upload'),
            db.func.max(TicketData.created_at).label('last_upload')
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
        
        periods_data = []
        for period in periods:
            periods_data.append({
                'month': period.processing_month,
                'year': period.processing_year,
                'period_label': f"{period.processing_month:02d}/{period.processing_year}",
                'record_count': period.record_count,
                'first_upload': period.first_upload.isoformat() if period.first_upload else None,
                'last_upload': period.last_upload.isoformat() if period.last_upload else None
            })
        
        return jsonify({
            'success': True,
            'periods': periods_data
        })
        
    except Exception as e:
        logger.error(f"Erro ao buscar períodos processados: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500

@admin_bp.route('/admin/delete-period/<int:month>/<int:year>', methods=['DELETE'])
def delete_processed_period(month, year):
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
        
        logger.info(f"Período {month:02d}/{year} deletado - {deleted_count} registros removidos")
        
        return jsonify({
            'success': True,
            'message': f'Período {month:02d}/{year} deletado com sucesso',
            'deleted_records': deleted_count
        })
        
    except Exception as e:
        logger.error(f"Erro ao deletar período {month:02d}/{year}: {e}")
        db.session.rollback()
        return jsonify({'error': 'Erro interno do servidor'}), 500

@admin_bp.route('/admin/upload-batches/<int:month>/<int:year>', methods=['GET'])
def get_upload_batches(month, year):
    """Lista todos os lotes de upload de um período específico"""
    try:
        batches = db.session.query(
            TicketData.upload_batch_id,
            db.func.count(TicketData.id).label('record_count'),
            db.func.min(TicketData.created_at).label('upload_time'),
            db.func.group_concat(db.func.distinct(TicketData.client_name)).label('clients')
        ).filter_by(
            processing_month=month,
            processing_year=year
        ).filter(
            TicketData.upload_batch_id.isnot(None)
        ).group_by(
            TicketData.upload_batch_id
        ).order_by(
            db.func.min(TicketData.created_at).desc()
        ).all()
        
        batches_data = []
        for batch in batches:
            clients = batch.clients.split(',') if batch.clients else []
            batches_data.append({
                'batch_id': batch.upload_batch_id,
                'record_count': batch.record_count,
                'upload_time': batch.upload_time.isoformat() if batch.upload_time else None,
                'clients': sorted(list(set(clients))),
                'month': month,
                'year': year
            })
        
        return jsonify({
            'success': True,
            'batches': batches_data
        })
        
    except Exception as e:
        logger.error(f"Erro ao buscar lotes de upload: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500

@admin_bp.route('/admin/delete-batch/<string:batch_id>', methods=['DELETE'])
def delete_upload_batch(batch_id):
    """Deleta um lote específico de upload"""
    try:
        # Verificar se o lote existe
        record_count = TicketData.query.filter_by(upload_batch_id=batch_id).count()
        
        if record_count == 0:
            return jsonify({'error': f'Nenhum registro encontrado para o lote {batch_id}'}), 404
        
        # Obter informações do lote antes de deletar
        batch_info = db.session.query(
            TicketData.processing_month,
            TicketData.processing_year,
            db.func.min(TicketData.created_at).label('upload_time')
        ).filter_by(upload_batch_id=batch_id).first()
        
        # Deletar registros
        deleted_count = TicketData.query.filter_by(upload_batch_id=batch_id).delete()
        
        db.session.commit()
        
        logger.info(f"Lote {batch_id} deletado - {deleted_count} registros removidos")
        
        return jsonify({
            'success': True,
            'message': f'Lote {batch_id} deletado com sucesso',
            'deleted_records': deleted_count,
            'batch_info': {
                'month': batch_info.processing_month,
                'year': batch_info.processing_year,
                'upload_time': batch_info.upload_time.isoformat() if batch_info.upload_time else None
            }
        })
        
    except Exception as e:
        logger.error(f"Erro ao deletar lote {batch_id}: {e}")
        db.session.rollback()
        return jsonify({'error': 'Erro interno do servidor'}), 500

@admin_bp.route('/admin/statistics', methods=['GET'])
def get_admin_statistics():
    """Retorna estatísticas gerais do sistema"""
    try:
        # Estatísticas de registros
        total_tickets = TicketData.query.count()
        
        # Período mais antigo e mais recente
        oldest_record = TicketData.query.filter(
            TicketData.processing_month.isnot(None),
            TicketData.processing_year.isnot(None)
        ).order_by(
            TicketData.processing_year.asc(),
            TicketData.processing_month.asc()
        ).first()
        
        newest_record = TicketData.query.filter(
            TicketData.processing_month.isnot(None),
            TicketData.processing_year.isnot(None)
        ).order_by(
            TicketData.processing_year.desc(),
            TicketData.processing_month.desc()
        ).first()
        
        # Estatísticas por cliente
        clients_stats = db.session.query(
            TicketData.client_name,
            db.func.count(TicketData.id).label('ticket_count'),
            db.func.sum(TicketData.total_service_time).label('total_hours')
        ).filter(
            TicketData.client_name.isnot(None)
        ).group_by(
            TicketData.client_name
        ).order_by(
            db.func.count(TicketData.id).desc()
        ).limit(10).all()
        
        # Estatísticas por técnico
        technician_stats = db.session.query(
            TicketData.technician,
            db.func.count(TicketData.id).label('ticket_count'),
            db.func.sum(TicketData.total_service_time).label('total_hours')
        ).filter(
            TicketData.technician.isnot(None)
        ).group_by(
            TicketData.technician
        ).order_by(
            db.func.count(TicketData.id).desc()
        ).limit(10).all()
        
        return jsonify({
            'success': True,
            'statistics': {
                'total_tickets': total_tickets,
                'oldest_period': {
                    'month': oldest_record.processing_month if oldest_record else None,
                    'year': oldest_record.processing_year if oldest_record else None
                },
                'newest_period': {
                    'month': newest_record.processing_month if newest_record else None,
                    'year': newest_record.processing_year if newest_record else None
                },
                'top_clients': [
                    {
                        'name': stat.client_name,
                        'ticket_count': stat.ticket_count,
                        'total_hours': round(stat.total_hours or 0, 2)
                    } for stat in clients_stats
                ],
                'top_technicians': [
                    {
                        'name': stat.technician,
                        'ticket_count': stat.ticket_count,
                        'total_hours': round(stat.total_hours or 0, 2)
                    } for stat in technician_stats
                ]
            }
        })
        
    except Exception as e:
        logger.error(f"Erro ao buscar estatísticas admin: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500

@admin_bp.route('/admin/backup-database', methods=['POST'])
def backup_database():
    """Cria backup do banco de dados"""
    try:
        from src.migrations import DatabaseMigrator
        
        migrator = DatabaseMigrator()
        if migrator.backup_database():
            return jsonify({
                'success': True,
                'message': 'Backup criado com sucesso'
            })
        else:
            return jsonify({'error': 'Erro ao criar backup'}), 500
            
    except Exception as e:
        logger.error(f"Erro ao criar backup: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500

@admin_bp.route('/admin/system-info', methods=['GET'])
def get_system_info():
    """Retorna informações do sistema"""
    try:
        import sqlite3
        import os
        from src.main import app
        
        # Informações do banco de dados
        db_path = app.config.get('SQLALCHEMY_DATABASE_URI', '').replace('sqlite:///', '')
        db_size = 0
        if os.path.exists(db_path):
            db_size = os.path.getsize(db_path)
        
        # Versão do banco
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT version FROM db_version ORDER BY id DESC LIMIT 1")
            db_version = cursor.fetchone()
            db_version = db_version[0] if db_version else 0
            conn.close()
        except:
            db_version = 0
        
        return jsonify({
            'success': True,
            'system_info': {
                'database_path': db_path,
                'database_size_mb': round(db_size / (1024 * 1024), 2),
                'database_version': db_version,
                'flask_debug': app.debug,
                'environment': 'development' if app.debug else 'production'
            }
        })
        
    except Exception as e:
        logger.error(f"Erro ao buscar info do sistema: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500