import { useState, useEffect } from 'react'
import axios from 'axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Loader2, Users, Clock, ExternalLink, BarChart3, TrendingUp, AlertCircle } from 'lucide-react'

const DashboardPage = () => {
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
    setError(null)
    try {
      const response = await axios.get(`/api/statistics/${month}/${year}`)
      setStatistics(response.data)
    } catch (err) {
      setError('Erro ao carregar estatísticas')
    } finally {
      setLoading(false)
    }
  }

  const loadBilling = async (month, year) => {
    try {
      const response = await axios.get(`/api/billing/${month}/${year}`)
      setBilling(response.data)
    } catch (err) {
      console.error('Erro ao carregar dados de faturamento:', err)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatHours = (hours) => {
    return `${hours?.toFixed(2) || 0}h`
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
      {/* Seletor de Período */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Dashboard Administrativo
          </CardTitle>
          <CardDescription>
            Visualize estatísticas e métricas de desempenho dos técnicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Período:</label>
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
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {statistics && (
        <>
          {/* Métricas Gerais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Tickets</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.general?.total_tickets || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clientes Atendidos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.general?.unique_clients || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Horas</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatHours(statistics.general?.total_hours)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Atendimentos Externos</CardTitle>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.general?.total_external_services || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* Resumo Financeiro */}
          {billing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Resumo Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Faturamento Total</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(billing.summary?.total_value || 0)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Clientes Faturados</p>
                    <p className="text-2xl font-bold">{billing.summary?.total_clients || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Horas Excedentes</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatHours(billing.summary?.total_overtime_hours)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Deslocamentos</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {billing.summary?.total_external_services || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance dos Técnicos */}
          <Card>
            <CardHeader>
              <CardTitle>Performance dos Técnicos</CardTitle>
              <CardDescription>
                Análise detalhada do desempenho de cada técnico no período
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(statistics.hours_by_technician || {}).map(([technician, hours]) => {
                  const tickets = statistics.tickets_by_technician?.[technician] || 0
                  const externalServices = statistics.external_services_by_technician?.[technician] || 0
                  const uniqueClients = statistics.unique_clients_by_technician?.[technician] || 0
                  const avgHoursPerTicket = tickets > 0 ? (hours / tickets).toFixed(2) : 0

                  return (
                    <div key={technician} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-lg">{technician}</h4>
                        <Badge variant="outline">{formatHours(hours)}</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Tickets Atendidos</p>
                          <p className="font-medium">{tickets}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Deslocamentos</p>
                          <p className="font-medium">{externalServices}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Clientes Únicos</p>
                          <p className="font-medium">{uniqueClients}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Média h/ticket</p>
                          <p className="font-medium">{avgHoursPerTicket}h</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Top Clientes por Horas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Clientes por Horas</CardTitle>
                <CardDescription>Clientes que mais consumiram horas no período</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(statistics.hours_by_client || {})
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 10)
                    .map(([client, hours]) => (
                      <div key={client} className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{client}</span>
                        <Badge variant="secondary">{formatHours(hours)}</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Categorias Mais Comuns */}
            <Card>
              <CardHeader>
                <CardTitle>Categorias Mais Comuns</CardTitle>
                <CardDescription>Tipos de atendimento mais frequentes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(statistics.primary_categories || {})
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 10)
                    .map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{category}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {!statistics && !loading && periods.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum dado disponível</h3>
            <p className="text-muted-foreground">
              Faça upload de um arquivo Excel na aba "Upload de Dados" para visualizar o dashboard
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default DashboardPage
