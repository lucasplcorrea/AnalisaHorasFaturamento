# Sistema de Faturamento Helpdesk

Este projeto consiste em uma aplicação web para auxiliar no fechamento do faturamento mensal de serviços de helpdesk. Ele processa dados de relatórios exportados, calcula valores de cobrança por cliente, gera relatórios individualizados em PDF e fornece um dashboard administrativo para análise de desempenho dos técnicos.

## Estrutura do Projeto

O projeto é dividido em duas partes principais:

-   `backend`: Uma API RESTful desenvolvida com Flask (Python).
-   `frontend`: Uma interface de usuário desenvolvida com React e Tailwind CSS.

## Requisitos

Para rodar este projeto, você precisará ter instalado:

-   Python 3.8+ (com `pip`)
-   Node.js 18+ (com `pnpm` ou `npm`)
-   Git (opcional, para clonar o repositório)

## Configuração e Execução

Siga os passos abaixo para configurar e executar a aplicação.

### 1. Backend (Flask)

1.  **Navegue até o diretório do backend:**
    ```bash
    cd helpdesk-billing
    ```

2.  **Crie e ative um ambiente virtual:**
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Instale as dependências do Python:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Execute a aplicação Flask:**
    ```bash
    python src/main.py
    ```
    O backend será iniciado e estará disponível em `http://localhost:5000`.

### 2. Frontend (React)

1.  **Navegue até o diretório do frontend:**
    ```bash
    cd helpdesk-billing-frontend
    ```

2.  **Instale as dependências do Node.js (usando pnpm):**
    ```bash
    pnpm install
    ```
    *Se você não tiver `pnpm`, pode usar `npm install` ou `yarn install`.*

3.  **Faça o build da aplicação React:**
    ```bash
    pnpm run build
    ```
    Isso criará uma pasta `dist` com os arquivos estáticos otimizados.

4.  **Copie os arquivos estáticos para o backend:**
    Os arquivos gerados na pasta `dist` do frontend precisam ser copiados para a pasta `src/static` do backend Flask para que o Flask possa servi-los.
    ```bash
    cp -r dist/* ../helpdesk-billing/src/static/
    ```
    *Certifique-se de que o backend Flask esteja no diretório `../helpdesk-billing` em relação ao frontend.*

5.  **Inicie o servidor de desenvolvimento (opcional, para desenvolvimento):**
    Se você quiser rodar o frontend separadamente para desenvolvimento com hot-reloading:
    ```bash
    pnpm run dev
    ```
    O frontend estará disponível em `http://localhost:5173` (ou outra porta disponível).

### 3. Acessando a Aplicação

Após seguir os passos do backend e copiar os arquivos do frontend, você pode acessar a aplicação completa através do endereço do backend:

`http://localhost:5000`

## Funcionalidades

-   **Upload de Dados:** Carregue arquivos XLSX com dados de helpdesk.
-   **Dashboard Administrativo:** Visualize estatísticas gerais e performance de técnicos.
-   **Gráficos:** Análises visuais de horas por cliente, faturamento e categorias.
-   **Gerenciamento de Clientes:** Edite as regras de contrato e cobrança por cliente.
-   **Relatórios de Faturamento:** Gere relatórios PDF individualizados por cliente e um resumo geral.

## Regras de Negócio Padrão

-   **Horas Contratuais:** 10 horas
-   **Valor da Hora Contratual:** R$ 100,00
-   **Valor da Hora Excedente:** R$ 115,00
-   **Valor por Atendimento Externo:** R$ 88,00

Essas regras podem ser ajustadas individualmente para cada cliente na seção de gerenciamento de clientes.

## Melhorias Futuras

-   Implementar autenticação e autorização de usuários.
-   Adicionar persistência de dados de tickets processados em um banco de dados relacional para histórico.
-   Melhorar a interface de usuário para configuração de regras de negócio e contratos.
-   Integração com sistemas de ERP/CRM.
-   Personalização avançada de relatórios PDF.

