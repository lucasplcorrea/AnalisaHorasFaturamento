# Copilot Instructions for AnalisaHorasFaturamento

## Architecture Overview

This is a **dual-repo helpdesk billing system** with Flask backend and React frontend that processes Excel reports to generate client billing PDFs. The key data flow: XLSX upload → pandas processing → SQLite storage → billing calculations → PDF reports.

### Key Components
- **Backend**: Flask app in `helpdesk-billing/` with modular structure (models, routes, services)
- **Frontend**: React/Vite SPA in `helpdesk-billing-frontend/` using shadcn/ui + Tailwind
- **Database**: SQLite with two main models: `Client` (billing rules) and `TicketData` (processed tickets)
- **Data Processing**: Excel → pandas → database pipeline with robust type conversion
- **PDF Generation**: ReportLab-based billing reports with custom styling

## Critical Patterns

### Backend Structure
- **Path handling**: Uses `sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))` for imports
- **Database**: SQLite in `src/database/app.db`, auto-created with `db.create_all()`
- **Static serving**: Backend serves frontend build files from `src/static/`
- **Blueprints**: API routes under `/api` prefix (billing, reports, user)

### Data Processing Conventions
```python
# Column mapping from Portuguese Excel headers to DB fields
self.column_mapping = {
    'Ticket': 'ticket_id',
    'Cliente': 'client_name',
    'Técnico': 'technician',
    # ... see DataProcessor.__init__
}
```
- **Time conversion**: Handles `HH:MM:SS` strings → float hours in `_convert_time_to_hours()`
- **Boolean conversion**: Portuguese "Sim/Não" → boolean in `_convert_to_boolean()`
- **NaN handling**: Extensive `pd.isna()` checks before DB insertion

### Business Logic
- **Default billing**: 10h contract @ R$100/h, R$115/h overtime, R$88 external service
- **Client-specific rules**: Override defaults in `Client` model
- **Period tracking**: Data tagged with `processing_month`/`processing_year`

## Development Workflows

### Backend Setup
```bash
cd helpdesk-billing
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python src/main.py  # Runs on localhost:5000
```

### Frontend Build & Deploy
```bash
cd helpdesk-billing-frontend
pnpm install
pnpm run build
cp -r dist/* ../helpdesk-billing/src/static/  # Copy to Flask static folder
```

### Key API Endpoints
- `POST /api/upload` - Process Excel files
- `GET /api/billing/summary` - Dashboard data
- `GET /api/billing/client/{name}` - Client billing details
- `GET /api/reports/generate/{client}` - PDF generation

## File Conventions

### Import Patterns
- Backend: `from src.models.client import Client` (using sys.path modification)
- Frontend: `@/components/ui/button.jsx` (Vite alias for src/)

### Database Models
- Use nullable columns extensively for Excel data inconsistencies
- Include `to_dict()` methods for JSON serialization
- DateTime fields with UTC defaults and proper null handling

### Component Structure
- Frontend uses shadcn/ui components with Tailwind CSS
- Tab-based navigation in main App.jsx
- Axios for API communication with backend

When working on this codebase, focus on the Excel-to-database pipeline robustness and the client billing calculation accuracy.