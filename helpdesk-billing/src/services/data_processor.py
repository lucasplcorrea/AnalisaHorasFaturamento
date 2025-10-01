import pandas as pd
from datetime import datetime
from typing import Dict, List, Tuple, Any
import re
import logging

logger = logging.getLogger(__name__)
from src.models.client import Client, TicketData
from src.database import db

class DataProcessor:
    """Classe responsável por processar os dados da planilha de helpdesk"""
    
    def __init__(self):
        self.column_mapping = {
            'Ticket': 'ticket_id',
            'Cliente': 'client_name',
            'Assunto': 'subject',
            'Técnico': 'technician',
            'Categoria primária': 'primary_category',
            'Categoria secundária': 'secondary_category',
            'contato': 'contact',
            'Data chegada': 'arrival_date',
            'Data saida': 'departure_date',
            'Data de finalização': 'completion_date',
            'Mesa de trabalho': 'workstation',
            'Motivo de pausa do ticket': 'pause_reason',
            'setor': 'sector',
            'Status': 'status',
            'Tipo de ticket': 'ticket_type',
            'Atendimento': 'service',
            'Descrição': 'description',
            'Atendimento em horário comercial?': 'business_hours',
            'Atendimento externo?': 'external_service',
            'Data inicial': 'start_date',
            'Data final': 'end_date',
            'Tempo total de atendimento': 'total_service_time'
        }
    
    def process_excel_file(self, file_path: str, month: int = None, year: int = None) -> Dict[str, Any]:
        """
        Processa o arquivo Excel e retorna estatísticas e dados processados
        
        Args:
            file_path: Caminho para o arquivo Excel
            month: Mês de referência (opcional, será inferido dos dados se não fornecido)
            year: Ano de referência (opcional, será inferido dos dados se não fornecido)
        
        Returns:
            Dict com estatísticas e dados processados
        """
        try:
            # Ler o arquivo Excel
            df = pd.read_excel(file_path)
            
            # Limpar e padronizar os dados
            df_clean = self._clean_dataframe(df)
            
            # Inferir mês e ano se não fornecidos
            if not month or not year:
                inferred_month, inferred_year = self._infer_period_from_data(df_clean)
                month = month or inferred_month
                year = year or inferred_year
            
            # Processar e salvar os dados no banco
            processed_data = self._process_and_save_data(df_clean, month, year)
            
            # Calcular estatísticas
            stats = self._calculate_statistics(df_clean)
            
            # Atualizar/criar clientes
            self._update_clients(df_clean)
            
            return {
                'success': True,
                'message': f'Dados processados com sucesso para {month:02d}/{year}',
                'statistics': stats,
                'processed_records': len(df_clean),
                'month': month,
                'year': year,
                'data': processed_data
            }
            
        except Exception as e:
            logger.exception("Erro ao processar o arquivo Excel")
            return {
                'success': False,
                'message': f'Erro ao processar arquivo: {str(e)}',
                'statistics': None,
                'processed_records': 0
            }
    
    def _clean_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """Limpa e padroniza os dados do DataFrame"""
        df_clean = df.copy()
        
        # Renomear colunas para o padrão interno
        df_clean = df_clean.rename(columns=self.column_mapping)
        
        # Converter colunas de data
        date_columns = ['arrival_date', 'departure_date', 'completion_date', 'start_date', 'end_date']
        for col in date_columns:
            if col in df_clean.columns:
                df_clean[col] = pd.to_datetime(df_clean[col], errors='coerce')
        
        # Converter tempo total de atendimento para horas
        if 'total_service_time' in df_clean.columns:
            df_clean['total_service_time'] = df_clean['total_service_time'].apply(self._convert_time_to_hours)
        
        # Converter colunas booleanas
        boolean_columns = ['business_hours', 'external_service']
        for col in boolean_columns:
            if col in df_clean.columns:
                df_clean[col] = df_clean[col].apply(self._convert_to_boolean)
        
        # Limpar strings
        string_columns = ['client_name', 'technician', 'primary_category', 'secondary_category']
        for col in string_columns:
            if col in df_clean.columns:
                df_clean[col] = df_clean[col].astype(str).str.strip()
        
        return df_clean
    
    def _convert_time_to_hours(self, time_value) -> float:
        """Converte diferentes formatos de tempo para horas"""
        if pd.isna(time_value):
            return 0.0
        
        if isinstance(time_value, (int, float)):
            return float(time_value)
        
        if isinstance(time_value, str):
            time_str = time_value.strip()
            
            if ':' in time_str:
                parts = time_str.split(':')
                hours = float(parts[0])
                minutes = float(parts[1]) if len(parts) > 1 else 0
                seconds = float(parts[2]) if len(parts) > 2 else 0
                return hours + (minutes / 60) + (seconds / 3600)
            
            try:
                return float(time_str)
            except ValueError:
                numbers = re.findall(r'\d+\.?\d*', time_str)
                if numbers:
                    return float(numbers[0])
        
        return 0.0
    
    def _convert_to_boolean(self, value) -> bool | None:
        """Converte diferentes formatos para boolean, retornando None para NaN"""
        if pd.isna(value):
            return None
        
        if isinstance(value, bool):
            return value
        
        if isinstance(value, str):
            value_lower = value.lower().strip()
            if value_lower in ['sim', 'yes', 'true', '1', 'verdadeiro']:
                return True
            if value_lower in ['não', 'no', 'false', '0', 'falso']:
                return False
            return None
        
        if isinstance(value, (int, float)):
            return bool(value)
        
        return None
    
    def _infer_period_from_data(self, df: pd.DataFrame) -> Tuple[int | None, int | None]:
        """Infere o mês e ano dos dados baseado nas datas de finalização"""
        if 'completion_date' in df.columns:
            valid_dates = df['completion_date'].dropna()
            if not valid_dates.empty:
                most_recent = valid_dates.max()
                return most_recent.month, most_recent.year
        
        return None, None
    
    def _process_and_save_data(self, df: pd.DataFrame, month: int | None, year: int | None) -> List[Dict]:
        """Processa e salva os dados no banco de dados"""
        processed_data = []
        
        if month is not None and year is not None:
            db.session.query(TicketData).filter_by(processing_month=month, processing_year=year).delete()
        
        for _, row in df.iterrows():
            try:
                ticket_data = TicketData(
                    ticket_id=str(row.get('ticket_id', '')) if pd.notna(row.get('ticket_id')) else None,
                    client_name=str(row.get('client_name', '')) if pd.notna(row.get('client_name')) else None,
                    subject=str(row.get('subject', '')) if pd.notna(row.get('subject')) else None,
                    technician=str(row.get('technician', '')) if pd.notna(row.get('technician')) else None,
                    primary_category=str(row.get('primary_category', '')) if pd.notna(row.get('primary_category')) else None,
                    secondary_category=str(row.get('secondary_category', '')) if pd.notna(row.get('secondary_category')) else None,
                    contact=str(row.get('contact', '')) if pd.notna(row.get('contact')) else None,
                    arrival_date=row.get('arrival_date') if pd.notna(row.get('arrival_date')) else None,
                    departure_date=row.get('departure_date') if pd.notna(row.get('departure_date')) else None,
                    completion_date=row.get('completion_date') if pd.notna(row.get('completion_date')) else None,
                    workstation=str(row.get('workstation', '')) if pd.notna(row.get('workstation')) else None,
                    pause_reason=str(row.get('pause_reason', '')) if pd.notna(row.get('pause_reason')) else None,
                    sector=str(row.get('sector', '')) if pd.notna(row.get('sector')) else None,
                    status=str(row.get('status', '')) if pd.notna(row.get('status')) else None,
                    ticket_type=str(row.get('ticket_type', '')) if pd.notna(row.get('ticket_type')) else None,
                    service=str(row.get('service', '')) if pd.notna(row.get('service')) else None,
                    description=str(row.get('description', '')) if pd.notna(row.get('description')) else None,
                    business_hours=self._convert_to_boolean(row.get('business_hours')),
                    external_service=self._convert_to_boolean(row.get('external_service')),
                    start_date=row.get('start_date') if pd.notna(row.get('start_date')) else None,
                    end_date=row.get('end_date') if pd.notna(row.get('end_date')) else None,
                    total_service_time=float(row.get('total_service_time', 0.0)) if pd.notna(row.get('total_service_time')) else 0.0,
                    processing_month=int(month) if pd.notna(month) else None,
                    processing_year=int(year) if pd.notna(year) else None
                )
                db.session.add(ticket_data)
                processed_data.append(ticket_data.to_dict())
            except Exception as e:
                logger.error(f"Erro ao criar TicketData para a linha: {row.to_dict()}")
                logger.exception("Detalhes da exceção:")
                continue
        
        db.session.commit()
        return processed_data
    
    def _update_clients(self, df: pd.DataFrame):
        """Atualiza ou cria clientes baseado nos dados processados"""
        unique_clients = df['client_name'].unique()
        
        for client_name in unique_clients:
            if pd.isna(client_name) or not str(client_name).strip():
                continue
                
            client_name = str(client_name).strip()
            
            existing_client = db.session.query(Client).filter_by(name=client_name).first()
            
            if not existing_client:
                client_data = df[df['client_name'] == client_name].iloc[0]
                
                new_client = Client(
                    name=client_name,
                    contact=str(client_data.get('contact', '')) if pd.notna(client_data.get('contact')) else None,
                    sector=str(client_data.get('sector', '')) if pd.notna(client_data.get('sector')) else None
                )
                db.session.add(new_client)
        
        db.session.commit()
    
    def _calculate_statistics(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Calcula estatísticas dos dados processados"""
        stats = {}
        
        stats['total_tickets'] = len(df)
        stats['unique_clients'] = df['client_name'].nunique()
        stats['unique_technicians'] = df['technician'].nunique()
        stats['total_hours'] = df['total_service_time'].sum()
        
        client_hours = df.groupby('client_name')['total_service_time'].sum().to_dict()
        stats['hours_by_client'] = {str(k): v for k, v in client_hours.items()}
        
        technician_hours = df.groupby('technician')['total_service_time'].sum().to_dict()
        stats['hours_by_technician'] = {str(k): v for k, v in technician_hours.items()}
        
        external_services = df[df['external_service'] == True].groupby('client_name').size().to_dict()
        stats['external_services_by_client'] = {str(k): v for k, v in external_services.items()}
        
        external_services_tech = df[df['external_service'] == True].groupby('technician').size().to_dict()
        stats['external_services_by_technician'] = {str(k): v for k, v in external_services_tech.items()}
        
        primary_categories = df['primary_category'].value_counts().to_dict()
        stats['primary_categories'] = {str(k): v for k, v in primary_categories.items()}
        
        secondary_categories = df['secondary_category'].value_counts().to_dict()
        stats['secondary_categories'] = {str(k): v for k, v in secondary_categories.items()}
        
        technician_stats = {}
        for tech in df['technician'].unique():
            if pd.isna(tech):
                continue
            
            tech_data = df[df['technician'] == tech]
            technician_stats[str(tech)] = {
                'total_hours': tech_data['total_service_time'].sum(),
                'total_tickets': len(tech_data),
                'external_services': len(tech_data[tech_data['external_service'] == True]),
                'unique_clients': tech_data['client_name'].nunique()
            }
        
        stats['technician_details'] = technician_stats
        
        return stats

class BillingCalculator:
    """Classe responsável pelos cálculos de faturamento"""
    
    def calculate_client_billing(self, client_name: str, month: int, year: int) -> Dict[str, Any]:
        """
        Calcula o faturamento para um cliente específico
        
        Args:
            client_name: Nome do cliente
            month: Mês de referência
            year: Ano de referência
        
        Returns:
            Dict com informações de faturamento
        """
        client = db.session.query(Client).filter_by(name=client_name).first()
        if not client:
            return {'error': f'Cliente {client_name} não encontrado'}
        
        tickets = TicketData.query.filter_by(
            client_name=client_name,
            processing_month=month,
            processing_year=year
        ).all()
        
        if not tickets:
            return {
                'client_name': client_name,
                'total_hours': 0,
                'contract_hours': client.contract_hours,
                'overtime_hours': 0,
                'external_services': 0,
                'contract_value': 0,
                'overtime_value': 0,
                'external_services_value': 0,
                'total_value': 0,
                'tickets': []
            }
        
        total_hours = sum(ticket.total_service_time for ticket in tickets if ticket.total_service_time is not None)
        external_services_count = sum(1 for ticket in tickets if ticket.external_service)
        
        contract_hours = min(total_hours, client.contract_hours)
        overtime_hours = max(0, total_hours - client.contract_hours)
        
        contract_value = contract_hours * client.hourly_rate
        overtime_value = overtime_hours * client.overtime_rate
        external_services_value = external_services_count * client.external_service_rate
        
        total_value = contract_value + overtime_value + external_services_value
        
        return {
            'client_name': client_name,
            'client_id': client.id,
            'total_hours': total_hours,
            'contract_hours': client.contract_hours,
            'used_contract_hours': contract_hours,
            'overtime_hours': overtime_hours,
            'external_services': external_services_count,
            'contract_value': contract_value,
            'overtime_value': overtime_value,
            'external_services_value': external_services_value,
            'total_value': total_value,
            'tickets': [ticket.to_dict() for ticket in tickets],
            'rates': {
                'hourly_rate': client.hourly_rate,
                'overtime_rate': client.overtime_rate,
                'external_service_rate': client.external_service_rate
            }
        }
    
    def calculate_all_clients_billing(self, month: int, year: int) -> List[Dict[str, Any]]:
        """Calcula o faturamento para todos os clientes do período"""
        client_names = db.session.query(TicketData.client_name).filter_by(
            processing_month=month,
            processing_year=year
        ).distinct().all()
        
        billing_data = []
        for (client_name,) in client_names:
            if client_name and client_name.strip():
                billing = self.calculate_client_billing(client_name, month, year)
                if 'error' not in billing:
                    billing_data.append(billing)
        
        return billing_data

