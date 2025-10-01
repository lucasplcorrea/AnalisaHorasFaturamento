from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from datetime import datetime
import os
from io import BytesIO
from src.services.data_processor import BillingCalculator

class PDFReportGenerator:
    """Classe responsável pela geração de relatórios PDF"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Configura estilos customizados para o PDF"""
        # Título principal
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#1f2937')
        ))
        
        # Subtítulo
        self.styles.add(ParagraphStyle(
            name='CustomSubtitle',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceAfter=20,
            alignment=TA_LEFT,
            textColor=colors.HexColor('#374151')
        ))
        
        # Texto normal customizado
        self.styles.add(ParagraphStyle(
            name='CustomNormal',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=12,
            alignment=TA_LEFT
        ))
        
        # Texto destacado
        self.styles.add(ParagraphStyle(
            name='CustomHighlight',
            parent=self.styles['Normal'],
            fontSize=12,
            spaceAfter=15,
            alignment=TA_LEFT,
            textColor=colors.HexColor('#059669'),
            fontName='Helvetica-Bold'
        ))
    
    def generate_client_report(self, client_name: str, month: int, year: int, output_path: str = None) -> str:
        """
        Gera relatório PDF para um cliente específico
        
        Args:
            client_name: Nome do cliente
            month: Mês de referência
            year: Ano de referência
            output_path: Caminho de saída (opcional)
        
        Returns:
            Caminho do arquivo PDF gerado
        """
        # Obter dados de faturamento
        calculator = BillingCalculator()
        billing_data = calculator.calculate_client_billing(client_name, month, year)
        
        if 'error' in billing_data:
            raise ValueError(f"Erro ao obter dados do cliente: {billing_data['error']}")
        
        # Definir caminho de saída
        if not output_path:
            safe_client_name = client_name.replace(' ', '_').replace('/', '_')
            filename = f"fatura_{safe_client_name}_{month:02d}_{year}.pdf"
            output_path = os.path.join(os.path.dirname(__file__), '..', 'reports', filename)
            
            # Criar diretório se não existir
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Criar documento PDF
        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18
        )
        
        # Construir conteúdo
        story = []
        
        # Cabeçalho
        story.extend(self._build_header(billing_data, month, year))
        
        # Resumo executivo
        story.extend(self._build_executive_summary(billing_data))
        
        # Detalhamento de custos
        story.extend(self._build_cost_breakdown(billing_data))
        
        # Lista de chamados
        story.extend(self._build_tickets_list(billing_data))
        
        # Rodapé
        story.extend(self._build_footer())
        
        # Gerar PDF
        doc.build(story)
        
        return output_path
    
    def _build_header(self, billing_data: dict, month: int, year: int) -> list:
        """Constrói o cabeçalho do relatório"""
        story = []
        
        # Título principal
        title = f"Relatório de Faturamento - {billing_data['client_name']}"
        story.append(Paragraph(title, self.styles['CustomTitle']))
        
        # Período
        period_text = f"Período: {month:02d}/{year}"
        story.append(Paragraph(period_text, self.styles['CustomSubtitle']))
        
        # Data de geração
        generation_date = f"Gerado em: {datetime.now().strftime('%d/%m/%Y às %H:%M')}"
        story.append(Paragraph(generation_date, self.styles['CustomNormal']))
        
        story.append(Spacer(1, 20))
        
        return story
    
    def _build_executive_summary(self, billing_data: dict) -> list:
        """Constrói o resumo executivo"""
        story = []
        
        story.append(Paragraph("Resumo Executivo", self.styles['CustomSubtitle']))
        
        # Tabela de resumo
        summary_data = [
            ['Descrição', 'Valor'],
            ['Horas Contratuais', f"{billing_data['contract_hours']:.2f}h"],
            ['Horas Utilizadas', f"{billing_data['total_hours']:.2f}h"],
            ['Horas Excedentes', f"{billing_data['overtime_hours']:.2f}h"],
            ['Atendimentos Externos', str(billing_data['external_services'])],
            ['', ''],
            ['Valor Total a Pagar', f"R$ {billing_data['total_value']:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')]
        ]
        
        summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -2), 1, colors.HexColor('#e5e7eb')),
            ('BACKGROUND', (-2, -1), (-1, -1), colors.HexColor('#dcfce7')),
            ('FONTNAME', (-2, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (-2, -1), (-1, -1), 12),
        ]))
        
        story.append(summary_table)
        story.append(Spacer(1, 20))
        
        return story
    
    def _build_cost_breakdown(self, billing_data: dict) -> list:
        """Constrói o detalhamento de custos"""
        story = []
        
        story.append(Paragraph("Detalhamento de Custos", self.styles['CustomSubtitle']))
        
        # Dados da tabela de custos
        cost_data = [
            ['Descrição', 'Quantidade', 'Valor Unitário', 'Valor Total']
        ]
        
        # Horas contratuais
        used_contract_hours = min(billing_data['total_hours'], billing_data['contract_hours'])
        if used_contract_hours > 0:
            cost_data.append([
                'Horas Contratuais',
                f"{used_contract_hours:.2f}h",
                f"R$ {billing_data['rates']['hourly_rate']:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'),
                f"R$ {billing_data['contract_value']:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
            ])
        
        # Horas excedentes
        if billing_data['overtime_hours'] > 0:
            cost_data.append([
                'Horas Excedentes',
                f"{billing_data['overtime_hours']:.2f}h",
                f"R$ {billing_data['rates']['overtime_rate']:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'),
                f"R$ {billing_data['overtime_value']:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
            ])
        
        # Atendimentos externos
        if billing_data['external_services'] > 0:
            cost_data.append([
                'Atendimentos Externos',
                str(billing_data['external_services']),
                f"R$ {billing_data['rates']['external_service_rate']:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'),
                f"R$ {billing_data['external_services_value']:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
            ])
        
        # Total
        cost_data.append(['', '', 'TOTAL:', f"R$ {billing_data['total_value']:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')])
        
        cost_table = Table(cost_data, colWidths=[2.5*inch, 1*inch, 1.2*inch, 1.3*inch])
        cost_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -2), 1, colors.HexColor('#e5e7eb')),
            ('BACKGROUND', (-2, -1), (-1, -1), colors.HexColor('#dcfce7')),
            ('FONTNAME', (-2, -1), (-1, -1), 'Helvetica-Bold'),
        ]))
        
        story.append(cost_table)
        story.append(Spacer(1, 20))
        
        return story
    
    def _build_tickets_list(self, billing_data: dict) -> list:
        """Constrói a lista de chamados"""
        story = []
        
        story.append(Paragraph("Lista de Chamados Atendidos", self.styles['CustomSubtitle']))
        
        if not billing_data['tickets']:
            story.append(Paragraph("Nenhum chamado encontrado para este período.", self.styles['CustomNormal']))
            return story
        
        # Cabeçalho da tabela
        tickets_data = [
            ['Ticket', 'Assunto', 'Técnico', 'Data Finalização', 'Horas', 'Externo']
        ]
        
        # Dados dos tickets
        for ticket in billing_data['tickets']:
            completion_date = ''
            if ticket.get('completion_date'):
                try:
                    date_obj = datetime.fromisoformat(ticket['completion_date'].replace('Z', '+00:00'))
                    completion_date = date_obj.strftime('%d/%m/%Y')
                except:
                    completion_date = ticket['completion_date'][:10] if ticket['completion_date'] else ''
            
            external_mark = 'Sim' if ticket.get('external_service') else 'Não'
            
            tickets_data.append([
                ticket.get('ticket_id', ''),
                ticket.get('subject', '')[:30] + ('...' if len(ticket.get('subject', '')) > 30 else ''),
                ticket.get('technician', ''),
                completion_date,
                f"{ticket.get('total_service_time', 0):.2f}h",
                external_mark
            ])
        
        tickets_table = Table(tickets_data, colWidths=[0.8*inch, 2.2*inch, 1.2*inch, 1*inch, 0.6*inch, 0.6*inch])
        tickets_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (4, 0), (5, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        story.append(tickets_table)
        story.append(Spacer(1, 20))
        
        return story
    
    def _build_footer(self) -> list:
        """Constrói o rodapé do relatório"""
        story = []
        
        story.append(Spacer(1, 30))
        
        footer_text = """
        <b>Observações:</b><br/>
        • Este relatório foi gerado automaticamente pelo Sistema de Faturamento Helpdesk<br/>
        • Os valores apresentados referem-se aos atendimentos realizados no período especificado<br/>
        • Para dúvidas ou esclarecimentos, entre em contato conosco<br/>
        <br/>
        <b>Forma de Pagamento:</b> Conforme contrato estabelecido<br/>
        <b>Vencimento:</b> Conforme condições contratuais
        """
        
        story.append(Paragraph(footer_text, self.styles['CustomNormal']))
        
        return story
    
    def generate_summary_report(self, month: int, year: int, output_path: str = None) -> str:
        """
        Gera relatório resumo de todos os clientes do período
        
        Args:
            month: Mês de referência
            year: Ano de referência
            output_path: Caminho de saída (opcional)
        
        Returns:
            Caminho do arquivo PDF gerado
        """
        calculator = BillingCalculator()
        all_billing = calculator.calculate_all_clients_billing(month, year)
        
        if not output_path:
            filename = f"resumo_faturamento_{month:02d}_{year}.pdf"
            output_path = os.path.join(os.path.dirname(__file__), '..', 'reports', filename)
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18
        )
        
        story = []
        
        # Cabeçalho
        title = f"Resumo de Faturamento - {month:02d}/{year}"
        story.append(Paragraph(title, self.styles['CustomTitle']))
        
        generation_date = f"Gerado em: {datetime.now().strftime('%d/%m/%Y às %H:%M')}"
        story.append(Paragraph(generation_date, self.styles['CustomNormal']))
        story.append(Spacer(1, 20))
        
        # Resumo geral
        total_value = sum(client['total_value'] for client in all_billing)
        total_hours = sum(client['total_hours'] for client in all_billing)
        total_overtime = sum(client['overtime_hours'] for client in all_billing)
        total_external = sum(client['external_services'] for client in all_billing)
        
        summary_text = f"""
        <b>Resumo Geral do Período:</b><br/>
        • Total de Clientes Faturados: {len(all_billing)}<br/>
        • Faturamento Total: R$ {total_value:,.2f}<br/>
        • Total de Horas: {total_hours:.2f}h<br/>
        • Horas Excedentes: {total_overtime:.2f}h<br/>
        • Atendimentos Externos: {total_external}
        """.replace(',', 'X').replace('.', ',').replace('X', '.')
        
        story.append(Paragraph(summary_text, self.styles['CustomHighlight']))
        story.append(Spacer(1, 20))
        
        # Tabela de clientes
        story.append(Paragraph("Faturamento por Cliente", self.styles['CustomSubtitle']))
        
        clients_data = [
            ['Cliente', 'Horas Utilizadas', 'Horas Excedentes', 'Atend. Externos', 'Valor Total']
        ]
        
        for client in sorted(all_billing, key=lambda x: x['total_value'], reverse=True):
            clients_data.append([
                client['client_name'][:25] + ('...' if len(client['client_name']) > 25 else ''),
                f"{client['total_hours']:.2f}h",
                f"{client['overtime_hours']:.2f}h",
                str(client['external_services']),
                f"R$ {client['total_value']:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
            ])
        
        clients_table = Table(clients_data, colWidths=[2.5*inch, 1*inch, 1*inch, 1*inch, 1.5*inch])
        clients_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
        ]))
        
        story.append(clients_table)
        
        doc.build(story)
        return output_path
