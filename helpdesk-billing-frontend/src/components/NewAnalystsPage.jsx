import { useState, useEffect } from 'react'
import axios from 'axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx'
import { Loader2, AlertCircle, UserCheck, Clock, BarChart3, TrendingUp, Users, Award } from 'lucide-react'
import { formatHoursToHoursMinutes, formatCurrency, formatDate } from '@/lib/formatters.js'

const NewAnalystsPage = () => {
  const [periods, setPeriods] = useState([])
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [technicianData, setTechnicianData] = useState(null)
  const [selectedAnalyst, setSelectedAnalyst] = useState(null)
  const [analystDetails, setAnalystDetails] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadPeriods()
  }, [])

  useEffect(() => {
    if (selectedPeriod) {
      const [month, year] = selectedPeriod.split('/')
      loadTechnicianData(parseInt(month), parseInt(year))
    }
  }, [selectedPeriod])

  useEffect(() => {
    if (selectedAnalyst && selectedPeriod) {
      const [month, year] = selectedPeriod.split('/')
      loadAnalystDetails(selectedAnalyst, parseInt(month), parseInt(year))
    }
  }, [selectedAnalyst, selectedPeriod])

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

  const loadTechnicianData = async (month, year) => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get(`/api/technician-performance/${month}/${year}`)
      setTechnicianData(response.data)
      
      // Selecionar o primeiro analista automaticamente
      if (response.data.performance_data?.length > 0) {
        setSelectedAnalyst(response.data.performance_data[0].technician)
      }
    } catch (err) {
      setError('Erro ao carregar dados dos analistas')
    } finally {
      setLoading(false)
    }
  }

  const loadAnalystDetails = async (analystName, month, year) => {
    try {
      // Buscar tickets específicos do analista
      const response = await axios.get(`/api/technician-details/${encodeURIComponent(analystName)}/${month}/${year}`)
      setAnalystDetails(response.data)
    } catch (err) {
      console.error('Erro ao carregar detalhes do analista:', err)
    }
  }

  const getPerformanceLevel = (analyst, allAnalysts) => {
    const avgTickets = allAnalysts.reduce((sum, a) => sum + a.ticket_count, 0) / allAnalysts.length
    const avgHours = allAnalysts.reduce((sum, a) => sum + a.total_hours, 0) / allAnalysts.length
    
    if (analyst.ticket_count > avgTickets * 1.2 && analyst.total_hours > avgHours * 1.1) {
      return { level: 'Excelente', color: 'bg-green-100 text-green-800', icon: '🏆' }
    } else if (analyst.ticket_count > avgTickets) {
      return { level: 'Bom', color: 'bg-blue-100 text-blue-800', icon: '⭐' }
    } else if (analyst.ticket_count > avgTickets * 0.8) {
      return { level: 'Regular', color: 'bg-yellow-100 text-yellow-800', icon: '📊' }
    } else {
      return { level: 'Abaixo da Média', color: 'bg-gray-100 text-gray-800', icon: '📈' }
    }
  }

  if (loading && !technicianData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando dados dos analistas...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analistas</h1>
          <p className="text-gray-600 dark:text-gray-400">Performance e relatórios da equipe técnica</p>
        </div>
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

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {technicianData && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="individual">Performance Individual</TabsTrigger>
            <TabsTrigger value="comparison">Comparativo</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Estatísticas Gerais da Equipe */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Analistas</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{technicianData.performance_data?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Analistas ativos no período
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Chamados</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {technicianData.performance_data?.reduce((sum, analyst) => sum + analyst.ticket_count, 0) || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Chamados processados
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Horas Trabalhadas</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatHoursToHoursMinutes(
                      technicianData.performance_data?.reduce((sum, analyst) => sum + analyst.total_hours, 0) || 0
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total da equipe
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Produtividade Média</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(technicianData.performance_data?.reduce((sum, analyst) => sum + analyst.ticket_count, 0) / 
                      technicianData.performance_data?.length || 0).toFixed(1)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Chamados por analista
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Ranking dos Analistas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Ranking de Performance - {selectedPeriod}
                </CardTitle>
                <CardDescription>
                  Classificação dos analistas por performance no período
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {technicianData.performance_data?.map((analyst, index) => {
                    const performance = getPerformanceLevel(analyst, technicianData.performance_data)
                    return (
                      <div 
                        key={analyst.technician} 
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          selectedAnalyst === analyst.technician 
                            ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                        onClick={() => setSelectedAnalyst(analyst.technician)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-2xl font-bold text-blue-600">#{index + 1}</div>
                            <div>
                              <div className="font-semibold text-lg">{analyst.technician}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={performance.color}>
                                  {performance.icon} {performance.level}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-8 text-center">
                            <div>
                              <div className="text-2xl font-bold text-blue-600">{analyst.ticket_count}</div>
                              <div className="text-xs text-muted-foreground">Chamados</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-green-600">
                                {formatHoursToHoursMinutes(analyst.total_hours)}
                              </div>
                              <div className="text-xs text-muted-foreground">Horas</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-orange-600">
                                {formatHoursToHoursMinutes(analyst.avg_hours_per_ticket)}
                              </div>
                              <div className="text-xs text-muted-foreground">Média/Chamado</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="individual" className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-xl font-semibold">Performance Individual</h2>
              <Select value={selectedAnalyst} onValueChange={setSelectedAnalyst}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Selecione um analista" />
                </SelectTrigger>
                <SelectContent>
                  {technicianData.performance_data?.map((analyst) => (
                    <SelectItem key={analyst.technician} value={analyst.technician}>
                      {analyst.technician}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedAnalyst && (
              <>
                {/* Métricas do Analista Selecionado */}
                {(() => {
                  const analyst = technicianData.performance_data?.find(a => a.technician === selectedAnalyst)
                  const performance = getPerformanceLevel(analyst, technicianData.performance_data)
                  
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">{selectedAnalyst}</CardTitle>
                          <Badge className={performance.color}>
                            {performance.icon} {performance.level}
                          </Badge>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Período:</span>
                              <span className="font-medium">{selectedPeriod}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Chamados Atendidos</CardTitle>
                          <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-blue-600">{analyst?.ticket_count || 0}</div>
                          <p className="text-xs text-muted-foreground">
                            {((analyst?.ticket_count || 0) / (technicianData.performance_data?.reduce((sum, a) => sum + a.ticket_count, 0) || 1) * 100).toFixed(1)}% do total
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Horas Trabalhadas</CardTitle>
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-600">
                            {formatHoursToHoursMinutes(analyst?.total_hours || 0)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Total no período
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-orange-600">
                            {formatHoursToHoursMinutes(analyst?.avg_hours_per_ticket || 0)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Por chamado
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  )
                })()}

                {/* Detalhes dos Chamados do Analista */}
                {analystDetails && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Chamados Atendidos por {selectedAnalyst}</CardTitle>
                      <CardDescription>
                        Detalhamento dos chamados no período {selectedPeriod}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Ticket</TableHead>
                              <TableHead>Cliente</TableHead>
                              <TableHead>Assunto</TableHead>
                              <TableHead>Tempo Gasto</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {analystDetails.tickets?.slice(0, 10).map((ticket) => (
                              <TableRow key={ticket.ticket_id}>
                                <TableCell className="font-medium">{ticket.ticket_id}</TableCell>
                                <TableCell>{ticket.client_name}</TableCell>
                                <TableCell className="max-w-xs truncate">{ticket.subject || '-'}</TableCell>
                                <TableCell>{formatHoursToHoursMinutes(ticket.total_service_time)}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{ticket.status || 'N/A'}</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {analystDetails.tickets?.length > 10 && (
                        <div className="text-center mt-4 text-sm text-muted-foreground">
                          Mostrando 10 de {analystDetails.tickets.length} chamados
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Comparativo de Performance</CardTitle>
                <CardDescription>
                  Análise comparativa entre todos os analistas no período
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Posição</TableHead>
                        <TableHead>Analista</TableHead>
                        <TableHead>Chamados</TableHead>
                        <TableHead>Horas Totais</TableHead>
                        <TableHead>Média/Chamado</TableHead>
                        <TableHead>Performance</TableHead>
                        <TableHead>% do Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {technicianData.performance_data?.map((analyst, index) => {
                        const performance = getPerformanceLevel(analyst, technicianData.performance_data)
                        const totalTickets = technicianData.performance_data.reduce((sum, a) => sum + a.ticket_count, 0)
                        const percentage = ((analyst.ticket_count / totalTickets) * 100).toFixed(1)
                        
                        return (
                          <TableRow key={analyst.technician}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-blue-600">#{index + 1}</span>
                                {index < 3 && (
                                  <span className="text-lg">
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{analyst.technician}</TableCell>
                            <TableCell>
                              <div className="text-lg font-semibold">{analyst.ticket_count}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-lg font-semibold text-green-600">
                                {formatHoursToHoursMinutes(analyst.total_hours)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-lg font-semibold text-orange-600">
                                {formatHoursToHoursMinutes(analyst.avg_hours_per_ticket)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={performance.color}>
                                {performance.icon} {performance.level}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-medium">{percentage}%</div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {!technicianData && !loading && periods.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum dado disponível</h3>
            <p className="text-muted-foreground">
              Faça upload de um arquivo Excel para visualizar dados dos analistas
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default NewAnalystsPage