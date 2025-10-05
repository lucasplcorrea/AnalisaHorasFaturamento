import { useState, useEffect } from 'react'
import axios from 'axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Loader2, Users, Clock, DollarSign, BarChart3, TrendingUp, AlertCircle, Upload } from 'lucide-react'
import { formatHoursToHoursMinutes, formatCurrency, formatDate } from '@/lib/formatters.js'

const NewDashboardPage = ({ onNavigate }) => {
  const [periods, setPeriods] = useState([])
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [statistics, setStatistics] = useState(null)
  const [billing, setBilling] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadPeriods()
  }, [])

  useEffect(() => {
    if (selectedPeriod) {
      const [month, year] = selectedPeriod.split('/')
      loadStatistics(parseInt(month), parseInt(year))
      loadBilling(parseInt(month), parseInt(year))
    }
  }, [selectedPeriod])

  const loadPeriods = async () => {
    try {
      const response = await axios.get('/api/periods')
      setPeriods(response.data)
      if (response.data.length > 0) {
        setSelectedPeriod(response.data[0].label)
      }
    } catch (err) {
      setError('Erro ao carregar períodos disponíveis')
    }
  }

  const loadStatistics = async (month, year) => {
    setLoading(true)
    try {
      const response = await axios.get(`/api/statistics/${month}/${year}`)
      setStatistics(response.data)
    } catch (err) {
      setError('Erro ao carregar estatísticas')
    }
  }

  const loadBilling = async (month, year) => {
    try {
      const response = await axios.get(`/api/billing/${month}/${year}`)
      setBilling(response.data)
    } catch (err) {
      console.error('Erro ao carregar dados de faturamento:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !statistics) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando dashboard...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Visão geral do sistema de faturamento</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              {periods.map((period) => (
                <SelectItem key={period.label} value={period.label}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {statistics && (
        <>
          {/* Estatísticas Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Chamados</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.general?.total_tickets || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {statistics.general?.tickets_this_month > statistics.general?.tickets_last_month ? '+' : ''}
                  {((statistics.general?.tickets_this_month - statistics.general?.tickets_last_month) / statistics.general?.tickets_last_month * 100 || 0).toFixed(1)}% vs mês anterior
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Horas Trabalhadas</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatHoursToHoursMinutes(statistics.general?.total_hours)}</div>
                <p className="text-xs text-muted-foreground">
                  Média de {formatHoursToHoursMinutes(statistics.general?.avg_hours_per_ticket)} por chamado
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.general?.unique_clients || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {statistics.general?.new_clients || 0} novos este mês
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(billing?.summary?.total_value || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatHoursToHoursMinutes(billing?.summary?.total_overtime_hours)} horas extras
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
              <CardDescription>Acesse as principais funcionalidades do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  onClick={() => onNavigate('analytics')}
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  variant="outline"
                >
                  <TrendingUp className="h-6 w-6" />
                  <span>Ver Analytics</span>
                </Button>
                
                <Button 
                  onClick={() => onNavigate('reports')}
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  variant="outline"
                >
                  <BarChart3 className="h-6 w-6" />
                  <span>Gerar Relatórios</span>
                </Button>
                
                <Button 
                  onClick={() => onNavigate('clients')}
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  variant="outline"
                >
                  <Users className="h-6 w-6" />
                  <span>Gerenciar Clientes</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity - Top Clients */}
          {billing?.clients && billing.clients.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Clientes do Período</CardTitle>
                <CardDescription>Clientes com maior faturamento em {selectedPeriod}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {billing.clients
                    .sort((a, b) => b.total_value - a.total_value)
                    .slice(0, 5)
                    .map((client, index) => (
                      <div key={client.client_name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="text-lg font-bold text-blue-600">#{index + 1}</div>
                          <div>
                            <div className="font-semibold">{client.client_name}</div>
                            <div className="text-sm text-gray-500">
                              {client.tickets?.length || 0} chamados • {formatHoursToHoursMinutes(client.total_hours)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-600">
                            {formatCurrency(client.total_value)}
                          </div>
                          {client.overtime_hours > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {formatHoursToHoursMinutes(client.overtime_hours)} extras
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!statistics && !loading && periods.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum dado disponível</h3>
            <p className="text-muted-foreground mb-4">
              Faça upload de um arquivo Excel para começar a visualizar os dados
            </p>
            <Button onClick={() => onNavigate('settings')}>
              Fazer Upload de Dados
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default NewDashboardPage