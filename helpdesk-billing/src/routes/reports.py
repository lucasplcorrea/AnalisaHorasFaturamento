from flask import Blueprint, request, jsonify, send_file, current_app
import os
import zipfile
import tempfile
from datetime import datetime
from src.services.pdf_generator import PDFReportGenerator
from src.database import db
from src.models.client import TicketData

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/generate-pdf/<string:client_name>/<int:month>/<int:year>', methods=['GET'])
def generate_client_pdf(client_name, month, year):
    """Gera PDF de faturamento para um cliente específico"""
    try:
        generator = PDFReportGenerator()
        
        # Gerar PDF
        pdf_path = generator.generate_client_report(client_name, month, year)
        
        # Verificar se o arquivo foi criado
        if not os.path.exists(pdf_path):
            return jsonify({'error': 'Erro ao gerar PDF'}), 500
        
        # Definir nome do arquivo para download
        safe_client_name = client_name.replace(' ', '_').replace('/', '_')
        download_name = f"fatura_{safe_client_name}_{month:02d}_{year}.pdf"
        
        return send_file(
            pdf_path,
            as_attachment=True,
            download_name=download_name,
            mimetype='application/pdf'
        )
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': f'Erro interno do servidor: {str(e)}'}), 500

@reports_bp.route('/generate-summary-pdf/<int:month>/<int:year>', methods=['GET'])
def generate_summary_pdf(month, year):
    """Gera PDF resumo de todos os clientes do período"""
    try:
        generator = PDFReportGenerator()
        
        # Gerar PDF
        pdf_path = generator.generate_summary_report(month, year)
        
        # Verificar se o arquivo foi criado
        if not os.path.exists(pdf_path):
            return jsonify({'error': 'Erro ao gerar PDF resumo'}), 500
        
        # Definir nome do arquivo para download
        download_name = f"resumo_faturamento_{month:02d}_{year}.pdf"
        
        return send_file(
            pdf_path,
            as_attachment=True,
            download_name=download_name,
            mimetype='application/pdf'
        )
        
    except Exception as e:
        return jsonify({'error': f'Erro interno do servidor: {str(e)}'}), 500

@reports_bp.route('/generate-all-pdfs/<int:month>/<int:year>', methods=['POST'])
def generate_all_client_pdfs(month, year):
    """Gera PDFs para todos os clientes do período e retorna lista de arquivos"""
    try:
        from src.services.data_processor import BillingCalculator
        
        calculator = BillingCalculator()
        all_billing = calculator.calculate_all_clients_billing(month, year)
        
        if not all_billing:
            return jsonify({'error': 'Nenhum cliente encontrado para o período'}), 404
        
        generator = PDFReportGenerator()
        generated_files = []
        errors = []
        
        # Gerar PDF para cada cliente
        for client_billing in all_billing:
            try:
                client_name = client_billing['client_name']
                pdf_path = generator.generate_client_report(client_name, month, year)
                
                if os.path.exists(pdf_path):
                    generated_files.append({
                        'client_name': client_name,
                        'file_path': pdf_path,
                        'file_size': os.path.getsize(pdf_path)
                    })
                else:
                    errors.append(f'Erro ao gerar PDF para {client_name}')
                    
            except Exception as e:
                errors.append(f'Erro ao gerar PDF para {client_billing["client_name"]}: {str(e)}')
        
        # Gerar também o relatório resumo
        try:
            summary_path = generator.generate_summary_report(month, year)
            if os.path.exists(summary_path):
                generated_files.append({
                    'client_name': 'RESUMO_GERAL',
                    'file_path': summary_path,
                    'file_size': os.path.getsize(summary_path)
                })
        except Exception as e:
            errors.append(f'Erro ao gerar relatório resumo: {str(e)}')
        
        return jsonify({
            'success': True,
            'generated_files': len(generated_files),
            'files': generated_files,
            'errors': errors,
            'message': f'{len(generated_files)} arquivos PDF gerados com sucesso'
        })
        
    except Exception as e:
        return jsonify({'error': f'Erro interno do servidor: {str(e)}'}), 500

@reports_bp.route('/download-pdf/<path:file_path>', methods=['GET'])
def download_pdf(file_path):
    """Faz download de um PDF específico"""
    try:
        # Verificar se o arquivo existe e está no diretório correto
        full_path = os.path.join(os.path.dirname(__file__), '..', file_path)
        
        if not os.path.exists(full_path):
            return jsonify({'error': 'Arquivo não encontrado'}), 404
        
        # Extrair nome do arquivo
        filename = os.path.basename(full_path)
        
        return send_file(
            full_path,
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )
        
    except Exception as e:
        return jsonify({'error': f'Erro ao fazer download: {str(e)}'}), 500

@reports_bp.route('/list-reports/<int:month>/<int:year>', methods=['GET'])
def list_reports(month, year):
    """Lista relatórios PDF disponíveis para um período"""
    try:
        reports_dir = os.path.join(os.path.dirname(__file__), '..', 'reports')
        
        if not os.path.exists(reports_dir):
            return jsonify({'reports': []})
        
        reports = []
        pattern_month_year = f"_{month:02d}_{year}"
        
        for filename in os.listdir(reports_dir):
            if filename.endswith('.pdf') and pattern_month_year in filename:
                file_path = os.path.join(reports_dir, filename)
                file_stats = os.stat(file_path)
                
                # Determinar tipo de relatório
                report_type = 'client'
                client_name = 'Desconhecido'
                
                if filename.startswith('resumo_'):
                    report_type = 'summary'
                    client_name = 'Resumo Geral'
                elif filename.startswith('fatura_'):
                    # Extrair nome do cliente do nome do arquivo
                    parts = filename.replace('fatura_', '').replace('.pdf', '').split('_')
                    if len(parts) >= 3:
                        client_name = '_'.join(parts[:-2]).replace('_', ' ')
                
                reports.append({
                    'filename': filename,
                    'client_name': client_name,
                    'report_type': report_type,
                    'file_size': file_stats.st_size,
                    'created_at': datetime.fromtimestamp(file_stats.st_ctime).isoformat(),
                    'download_url': f'/api/download-pdf/reports/{filename}'
                })
        
        # Ordenar por data de criação (mais recente primeiro)
        reports.sort(key=lambda x: x['created_at'], reverse=True)
        
        return jsonify({
            'reports': reports,
            'total': len(reports),
            'period': f"{month:02d}/{year}"
        })
        
    except Exception as e:
        return jsonify({'error': f'Erro ao listar relatórios: {str(e)}'}), 500

@reports_bp.route('/generate-selected-zip/<int:month>/<int:year>', methods=['POST'])
def generate_selected_zip(month, year):
    """Gera ZIP com PDFs selecionados"""
    try:
        data = request.get_json()
        selected_clients = data.get('clients', [])
        
        if not selected_clients:
            return jsonify({'error': 'Nenhum cliente selecionado'}), 400
        
        generator = PDFReportGenerator()
        
        # Criar arquivo ZIP temporário
        temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
        temp_zip.close()
        
        with zipfile.ZipFile(temp_zip.name, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            generated_count = 0
            errors = []
            
            for client_name in selected_clients:
                try:
                    # Gerar PDF para o cliente
                    pdf_path = generator.generate_client_report(client_name, month, year)
                    
                    if os.path.exists(pdf_path):
                        # Adicionar ao ZIP com nome limpo
                        safe_client_name = client_name.replace(' ', '_').replace('/', '_')
                        zip_filename = f"fatura_{safe_client_name}_{month:02d}_{year}.pdf"
                        zip_file.write(pdf_path, zip_filename)
                        generated_count += 1
                    else:
                        errors.append(f'Erro ao gerar PDF para {client_name}')
                        
                except Exception as e:
                    errors.append(f'Erro ao processar {client_name}: {str(e)}')
        
        if generated_count == 0:
            os.unlink(temp_zip.name)
            return jsonify({'error': 'Nenhum PDF foi gerado com sucesso'}), 500
        
        # Definir nome do arquivo ZIP
        zip_filename = f"faturas_selecionadas_{month:02d}_{year}.zip"
        
        # Retornar ZIP para download
        return send_file(
            temp_zip.name,
            as_attachment=True,
            download_name=zip_filename,
            mimetype='application/zip'
        )
        
    except Exception as e:
        return jsonify({'error': f'Erro interno do servidor: {str(e)}'}), 500

@reports_bp.route('/cleanup-reports', methods=['POST'])
def cleanup_old_reports():
    """Remove relatórios PDF antigos (mais de 30 dias)"""
    try:
        reports_dir = os.path.join(os.path.dirname(__file__), '..', 'reports')
        
        if not os.path.exists(reports_dir):
            return jsonify({'message': 'Diretório de relatórios não existe', 'removed': 0})
        
        removed_count = 0
        current_time = datetime.now().timestamp()
        thirty_days = 30 * 24 * 60 * 60  # 30 dias em segundos
        
        for filename in os.listdir(reports_dir):
            if filename.endswith('.pdf'):
                file_path = os.path.join(reports_dir, filename)
                file_age = current_time - os.path.getctime(file_path)
                
                if file_age > thirty_days:
                    try:
                        os.remove(file_path)
                        removed_count += 1
                    except Exception as e:
                        print(f"Erro ao remover arquivo {filename}: {e}")
        
        return jsonify({
            'message': f'{removed_count} relatórios antigos removidos',
            'removed': removed_count
        })
        
    except Exception as e:
        return jsonify({'error': f'Erro na limpeza: {str(e)}'}), 500
