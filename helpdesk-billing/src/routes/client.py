from flask import Blueprint, request, jsonify
from src.models.client import Client
from src.database import db
import logging

logger = logging.getLogger(__name__)

client_bp = Blueprint('client', __name__)

@client_bp.route('/clients', methods=['GET'])
def get_clients():
    """Lista todos os clientes"""
    try:
        clients = Client.query.all()
        return jsonify({
            'success': True,
            'clients': [client.to_dict() for client in clients]
        })
    except Exception as e:
        logger.error(f"Erro ao buscar clientes: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500

@client_bp.route('/clients/<int:client_id>', methods=['GET'])
def get_client(client_id):
    """Busca um cliente específico"""
    try:
        client = Client.query.get_or_404(client_id)
        return jsonify({
            'success': True,
            'client': client.to_dict()
        })
    except Exception as e:
        logger.error(f"Erro ao buscar cliente {client_id}: {e}")
        return jsonify({'error': 'Cliente não encontrado'}), 404

@client_bp.route('/clients', methods=['POST'])
def create_client():
    """Cria um novo cliente"""
    try:
        data = request.json
        
        # Validação básica
        if not data.get('name'):
            return jsonify({'error': 'Nome do cliente é obrigatório'}), 400
        
        # Verificar se já existe
        existing_client = Client.query.filter_by(name=data['name']).first()
        if existing_client:
            return jsonify({'error': 'Cliente com este nome já existe'}), 400
        
        # Criar novo cliente
        client = Client(
            name=data['name'],
            contact=data.get('contact'),
            sector=data.get('sector'),
            contract_hours=float(data.get('contract_hours', 10.0)),
            hourly_rate=float(data.get('hourly_rate', 100.0)),
            overtime_rate=float(data.get('overtime_rate', 115.0)),
            external_service_rate=float(data.get('external_service_rate', 88.0)),
            email=data.get('email'),
            phone=data.get('phone'),
            address=data.get('address'),
            notes=data.get('notes'),
            active=data.get('active', True)
        )
        
        db.session.add(client)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Cliente criado com sucesso',
            'client': client.to_dict()
        }), 201
        
    except ValueError as e:
        return jsonify({'error': f'Erro de validação: {e}'}), 400
    except Exception as e:
        logger.error(f"Erro ao criar cliente: {e}")
        db.session.rollback()
        return jsonify({'error': 'Erro interno do servidor'}), 500

@client_bp.route('/clients/<int:client_id>', methods=['PUT'])
def update_client(client_id):
    """Atualiza um cliente existente"""
    try:
        client = Client.query.get_or_404(client_id)
        data = request.json
        
        # Validação básica
        if 'name' in data and not data['name']:
            return jsonify({'error': 'Nome do cliente não pode estar vazio'}), 400
        
        # Verificar nome único (se mudou)
        if 'name' in data and data['name'] != client.name:
            existing = Client.query.filter_by(name=data['name']).first()
            if existing:
                return jsonify({'error': 'Cliente com este nome já existe'}), 400
        
        # Atualizar campos
        updatable_fields = [
            'name', 'contact', 'sector', 'email', 'phone', 'address', 'notes', 'active'
        ]
        
        for field in updatable_fields:
            if field in data:
                setattr(client, field, data[field])
        
        # Atualizar campos numéricos com validação
        numeric_fields = ['contract_hours', 'hourly_rate', 'overtime_rate', 'external_service_rate']
        for field in numeric_fields:
            if field in data:
                try:
                    setattr(client, field, float(data[field]))
                except (ValueError, TypeError):
                    return jsonify({'error': f'Valor inválido para {field}'}), 400
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Cliente atualizado com sucesso',
            'client': client.to_dict()
        })
        
    except Exception as e:
        logger.error(f"Erro ao atualizar cliente {client_id}: {e}")
        db.session.rollback()
        return jsonify({'error': 'Erro interno do servidor'}), 500

@client_bp.route('/clients/<int:client_id>', methods=['DELETE'])
def delete_client(client_id):
    """Remove um cliente (soft delete - marca como inativo)"""
    try:
        client = Client.query.get_or_404(client_id)
        
        # Soft delete - apenas marca como inativo
        client.active = False
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Cliente desativado com sucesso'
        })
        
    except Exception as e:
        logger.error(f"Erro ao remover cliente {client_id}: {e}")
        db.session.rollback()
        return jsonify({'error': 'Erro interno do servidor'}), 500

@client_bp.route('/clients/search', methods=['GET'])
def search_clients():
    """Busca clientes por nome"""
    try:
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify({'error': 'Parâmetro de busca obrigatório'}), 400
        
        clients = Client.query.filter(
            Client.name.ilike(f'%{query}%'),
            Client.active == True
        ).all()
        
        return jsonify({
            'success': True,
            'clients': [client.to_dict() for client in clients],
            'count': len(clients)
        })
        
    except Exception as e:
        logger.error(f"Erro na busca de clientes: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500