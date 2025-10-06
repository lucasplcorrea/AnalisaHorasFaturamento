from flask import Blueprint, request, jsonify
from src.models.client import Client
from src.database import db
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)

auto_clients_bp = Blueprint('auto_clients', __name__)

@auto_clients_bp.route('/clients/auto-populate', methods=['POST'])
def auto_populate_clients():
    """
    Extrai clientes únicos dos dados de tickets processados 
    e os adiciona automaticamente à tabela de clientes
    """
    try:
        # Buscar clientes únicos nos dados de tickets que não estão na tabela clients
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
        new_client_names = [row[0] for row in result.fetchall()]
        
        created_clients = []
        
        for client_name in new_client_names:
            # Criar cliente com configurações padrão
            new_client = Client(
                name=client_name.strip(),
                contact=None,
                sector=None,
                contract_hours=10.0,  # Padrão
                hourly_rate=100.0,    # Padrão
                overtime_rate=115.0,  # Padrão
                external_service_rate=88.0,  # Padrão
                email=None,
                phone=None,
                whatsapp_contact=None,
                address=None,
                notes=f'Cliente criado automaticamente a partir dos dados processados',
                active=True
            )
            
            db.session.add(new_client)
            created_clients.append(client_name)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'{len(created_clients)} novos clientes criados automaticamente',
            'created_clients': created_clients,
            'count': len(created_clients)
        })
        
    except Exception as e:
        logger.error(f"Erro ao criar clientes automaticamente: {e}")
        db.session.rollback()
        return jsonify({'error': 'Erro interno do servidor'}), 500

@auto_clients_bp.route('/clients/sync-check', methods=['GET'])
def check_sync_status():
    """
    Verifica quantos clientes únicos existem nos dados de tickets
    que ainda não estão cadastrados na tabela de clientes
    """
    try:
        # Contar total de clientes únicos nos dados
        total_query = text("""
            SELECT COUNT(DISTINCT td.client_name)
            FROM ticket_data td
            WHERE td.client_name IS NOT NULL 
            AND TRIM(td.client_name) != ''
        """)
        total_result = db.session.execute(total_query).fetchone()
        total_unique_clients = total_result[0] if total_result else 0
        
        # Contar clientes já registrados
        registered_query = text("""
            SELECT COUNT(DISTINCT c.name)
            FROM clients c
        """)
        registered_result = db.session.execute(registered_query).fetchone()
        registered_clients = registered_result[0] if registered_result else 0
        
        # Buscar clientes únicos nos dados que não estão cadastrados
        missing_query = text("""
            SELECT DISTINCT td.client_name
            FROM ticket_data td
            LEFT JOIN clients c ON LOWER(TRIM(td.client_name)) = LOWER(TRIM(c.name))
            WHERE c.id IS NULL 
            AND td.client_name IS NOT NULL 
            AND TRIM(td.client_name) != ''
            ORDER BY td.client_name
            LIMIT 10
        """)
        
        missing_result = db.session.execute(missing_query)
        missing_clients = [row[0] for row in missing_result.fetchall()]
        missing_count = len(missing_clients)
        
        # Se não encontrou na amostra, contar todos
        if missing_count == 0:
            count_query = text("""
                SELECT COUNT(DISTINCT td.client_name)
                FROM ticket_data td
                LEFT JOIN clients c ON LOWER(TRIM(td.client_name)) = LOWER(TRIM(c.name))
                WHERE c.id IS NULL 
                AND td.client_name IS NOT NULL 
                AND TRIM(td.client_name) != ''
            """)
            count_result = db.session.execute(count_query).fetchone()
            missing_count = count_result[0] if count_result else 0
        
        return jsonify({
            'success': True,
            'total_unique_clients_in_data': total_unique_clients,
            'registered_clients': registered_clients,
            'missing_clients_count': missing_count,
            'missing_clients_sample': missing_clients,
            'needs_sync': missing_count > 0
        })
        
    except Exception as e:
        logger.error(f"Erro ao verificar status de sincronização: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500

@auto_clients_bp.route('/clients/data-summary', methods=['GET'])
def get_clients_data_summary():
    """
    Retorna resumo dos clientes com dados de atividade dos últimos meses
    """
    try:
        query = text("""
            SELECT 
                c.id,
                c.name,
                c.active,
                COUNT(DISTINCT td.processing_month || '/' || td.processing_year) as active_months,
                COUNT(td.ticket_id) as total_tickets,
                SUM(td.total_hours) as total_hours,
                MAX(td.processing_year * 12 + td.processing_month) as last_activity_period,
                MIN(td.processing_year * 12 + td.processing_month) as first_activity_period
            FROM clients c
            LEFT JOIN ticket_data td ON LOWER(TRIM(c.name)) = LOWER(TRIM(td.client_name))
            GROUP BY c.id, c.name, c.active
            ORDER BY last_activity_period DESC NULLS LAST, c.name
        """)
        
        result = db.session.execute(query)
        
        clients_summary = []
        for row in result.fetchall():
            # Converter período numérico de volta para mês/ano
            last_period = None
            first_period = None
            
            if row[6]:  # last_activity_period
                year = row[6] // 12
                month = row[6] % 12
                if month == 0:
                    month = 12
                    year -= 1
                last_period = f"{month:02d}/{year}"
            
            if row[7]:  # first_activity_period
                year = row[7] // 12
                month = row[7] % 12
                if month == 0:
                    month = 12
                    year -= 1
                first_period = f"{month:02d}/{year}"
            
            clients_summary.append({
                'id': row[0],
                'name': row[1],
                'active': row[2],
                'active_months': row[3] or 0,
                'total_tickets': row[4] or 0,
                'total_hours': float(row[5]) if row[5] else 0.0,
                'last_activity': last_period,
                'first_activity': first_period,
                'has_data': row[4] > 0 if row[4] else False
            })
        
        return jsonify({
            'success': True,
            'clients': clients_summary,
            'total_clients': len(clients_summary)
        })
        
    except Exception as e:
        logger.error(f"Erro ao buscar resumo de dados dos clientes: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500