from flask import Blueprint, request, jsonify
from src.models.technician import Technician
from src.database import db
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

technician_bp = Blueprint('technician', __name__)

@technician_bp.route('/technicians', methods=['GET'])
def get_technicians():
    """Lista todos os técnicos"""
    try:
        technicians = Technician.query.filter_by(active=True).all()
        return jsonify({
            'success': True,
            'technicians': [technician.to_dict() for technician in technicians]
        })
    except Exception as e:
        logger.error(f"Erro ao buscar técnicos: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500

@technician_bp.route('/technicians/<int:technician_id>', methods=['GET'])
def get_technician(technician_id):
    """Busca um técnico específico"""
    try:
        technician = Technician.query.get_or_404(technician_id)
        return jsonify({
            'success': True,
            'technician': technician.to_dict()
        })
    except Exception as e:
        logger.error(f"Erro ao buscar técnico {technician_id}: {e}")
        return jsonify({'error': 'Técnico não encontrado'}), 404

@technician_bp.route('/technicians', methods=['POST'])
def create_technician():
    """Cria um novo técnico"""
    try:
        data = request.json
        
        # Validação básica
        if not data.get('name'):
            return jsonify({'error': 'Nome do técnico é obrigatório'}), 400
        
        # Verificar se já existe
        existing_technician = Technician.query.filter_by(name=data['name']).first()
        if existing_technician:
            return jsonify({'error': 'Técnico com este nome já existe'}), 400
        
        # Criar novo técnico
        technician = Technician(
            name=data['name'],
            email=data.get('email'),
            phone=data.get('phone'),
            department=data.get('department'),
            monthly_hours_target=float(data.get('monthly_hours_target', 160.0)),
            efficiency_target=float(data.get('efficiency_target', 85.0)),
            hire_date=datetime.fromisoformat(data['hire_date']) if data.get('hire_date') else None,
            active=data.get('active', True)
        )
        
        db.session.add(technician)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Técnico criado com sucesso',
            'technician': technician.to_dict()
        }), 201
        
    except ValueError as e:
        return jsonify({'error': f'Erro de validação: {e}'}), 400
    except Exception as e:
        logger.error(f"Erro ao criar técnico: {e}")
        db.session.rollback()
        return jsonify({'error': 'Erro interno do servidor'}), 500

@technician_bp.route('/technicians/<int:technician_id>', methods=['PUT'])
def update_technician(technician_id):
    """Atualiza um técnico existente"""
    try:
        technician = Technician.query.get_or_404(technician_id)
        data = request.json
        
        # Validação básica
        if 'name' in data and not data['name']:
            return jsonify({'error': 'Nome do técnico não pode estar vazio'}), 400
        
        # Verificar nome único (se mudou)
        if 'name' in data and data['name'] != technician.name:
            existing = Technician.query.filter_by(name=data['name']).first()
            if existing:
                return jsonify({'error': 'Técnico com este nome já existe'}), 400
        
        # Atualizar campos
        updatable_fields = ['name', 'email', 'phone', 'department', 'active']
        
        for field in updatable_fields:
            if field in data:
                setattr(technician, field, data[field])
        
        # Atualizar campos numéricos com validação
        if 'monthly_hours_target' in data:
            try:
                technician.monthly_hours_target = float(data['monthly_hours_target'])
            except (ValueError, TypeError):
                return jsonify({'error': 'Valor inválido para meta de horas mensais'}), 400
                
        if 'efficiency_target' in data:
            try:
                technician.efficiency_target = float(data['efficiency_target'])
            except (ValueError, TypeError):
                return jsonify({'error': 'Valor inválido para meta de eficiência'}), 400
        
        # Data de contratação
        if 'hire_date' in data and data['hire_date']:
            try:
                technician.hire_date = datetime.fromisoformat(data['hire_date'])
            except ValueError:
                return jsonify({'error': 'Formato de data inválido'}), 400
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Técnico atualizado com sucesso',
            'technician': technician.to_dict()
        })
        
    except Exception as e:
        logger.error(f"Erro ao atualizar técnico {technician_id}: {e}")
        db.session.rollback()
        return jsonify({'error': 'Erro interno do servidor'}), 500

@technician_bp.route('/technicians/<int:technician_id>/stats/<int:month>/<int:year>', methods=['GET'])
def get_technician_stats(technician_id, month, year):
    """Retorna estatísticas de um técnico para um período específico"""
    try:
        technician = Technician.query.get_or_404(technician_id)
        stats = technician.get_monthly_stats(month, year)
        
        return jsonify({
            'success': True,
            'technician': technician.to_dict(),
            'period': {'month': month, 'year': year},
            'stats': stats
        })
        
    except Exception as e:
        logger.error(f"Erro ao buscar estatísticas do técnico {technician_id}: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500

@technician_bp.route('/technicians/stats/<int:month>/<int:year>', methods=['GET'])
def get_all_technicians_stats(month, year):
    """Retorna estatísticas de todos os técnicos para um período"""
    try:
        technicians = Technician.query.filter_by(active=True).all()
        
        stats_data = []
        for technician in technicians:
            stats = technician.get_monthly_stats(month, year)
            stats_data.append({
                'technician': technician.to_dict(),
                'stats': stats
            })
        
        return jsonify({
            'success': True,
            'period': {'month': month, 'year': year},
            'technicians_stats': stats_data
        })
        
    except Exception as e:
        logger.error(f"Erro ao buscar estatísticas gerais dos técnicos: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500

@technician_bp.route('/technicians/search', methods=['GET'])
def search_technicians():
    """Busca técnicos por nome"""
    try:
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify({'error': 'Parâmetro de busca obrigatório'}), 400
        
        technicians = Technician.query.filter(
            Technician.name.ilike(f'%{query}%'),
            Technician.active == True
        ).all()
        
        return jsonify({
            'success': True,
            'technicians': [technician.to_dict() for technician in technicians],
            'count': len(technicians)
        })
        
    except Exception as e:
        logger.error(f"Erro na busca de técnicos: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500