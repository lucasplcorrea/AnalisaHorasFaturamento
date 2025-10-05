import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Upload, BarChart3, Users, FileText, Settings, TrendingUp } from 'lucide-react'
import UploadPage from './components/UploadPage'
import DashboardPage from './components/DashboardPage'
import ClientsPage from './components/ClientsPage'
import ClientManagementPage from './components/ClientManagementPage'
import ReportsPage from './components/ReportsPage'
import ChartsPage from './components/ChartsPage'
import AnalyticsPage from './components/AnalyticsPage'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('upload')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Sistema de Faturamento Helpdesk
          </h1>
          <p className="text-lg text-gray-600">
            Gerencie o faturamento mensal dos seus atendimentos de forma eficiente
          </p>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7 mb-8">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload de Dados
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="charts" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Gráficos
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="client-management" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Relatórios
            </TabsTrigger>
          </TabsList>

          {/* Tab Contents */}
          <TabsContent value="upload" className="space-y-6">
            <UploadPage />
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-6">
            <DashboardPage />
          </TabsContent>

          <TabsContent value="charts" className="space-y-6">
            <ChartsPage />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsPage />
          </TabsContent>

          <TabsContent value="clients" className="space-y-6">
            <ClientsPage />
          </TabsContent>

          <TabsContent value="client-management" className="space-y-6">
            <ClientManagementPage />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <ReportsPage />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default App
