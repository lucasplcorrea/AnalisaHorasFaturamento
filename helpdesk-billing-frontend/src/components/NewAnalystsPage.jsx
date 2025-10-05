import { useState, useEffect } from 'react'
import axios from 'axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx'
import { Loader2, AlertCircle, UserCheck, Clock, BarChart3, TrendingUp, Users, Award, Info } from 'lucide-react'
import { formatHoursToHoursMinutes, formatCurrency, formatDate } from '@/lib/formatters.js'

const NewAnalystsPage = () => {
  const [periods, setPeriods] = useState([])
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [technicianData, setTechnicianData] = useState(null)
  const [selectedAnalyst, setSelectedAnalyst] = useState(null)
  const [analystDetails, setAnalystDetails] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sortBy, setSortBy] = useState('ticket_count') // nova ordenação
  const [comparisonMode, setComparisonMode] = useState('tickets') // nova modalidade de comparativo
  const [ticketTableSort, setTicketTableSort] = useState('time_desc') // ordenação da tabela de tickets
  const [ticketTablePage, setTicketTablePage] = useState(1) // página atual da tabela
  const [ticketsPerPage] = useState(10) // tickets por página

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
      setTicketTablePage(1) // resetar página quando analista muda
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
    const totalHours = analyst.total_hours || 0
    
    // Critérios de Performance baseados em horas trabalhadas:
    // Excelente: Acima de 140 horas no período
    // Bom: Entre 120 e 140 horas no período  
    // Regular: Entre 100 e 120 horas no período
    // Abaixo da Média: Menos de 100 horas no período
    
    if (totalHours >= 140) {
      return { 
        level: 'Excelente', 
        color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', 
        icon: '🏆',
        description: 'Acima de 140 horas trabalhadas'
      }
    } else if (totalHours >= 120) {
      return { 
        level: 'Bom', 
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', 
        icon: '⭐',
        description: 'Entre 120 e 140 horas trabalhadas'
      }
    } else if (totalHours >= 100) {
      return { 
        level: 'Regular', 
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', 
        icon: '📊',
        description: 'Entre 100 e 120 horas trabalhadas'
      }
    } else {
      return { 
        level: 'Abaixo da Média', 
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200', 
        icon: '📈',
        description: 'Menos de 100 horas trabalhadas'
      }
    }
  }

  const getSortedTickets = (tickets, sortBy) => {
    if (!tickets) return []
    
    const sorted = [...tickets]
    switch (sortBy) {
      case 'time_desc':
        return sorted.sort((a, b) => (b.total_service_time || 0) - (a.total_service_time || 0))
      case 'time_asc':
        return sorted.sort((a, b) => (a.total_service_time || 0) - (b.total_service_time || 0))
      case 'ticket_id':
        return sorted.sort((a, b) => a.ticket_id.localeCompare(b.ticket_id))
      case 'client_name':
        return sorted.sort((a, b) => a.client_name.localeCompare(b.client_name))
      case 'external_first':
        return sorted.sort((a, b) => (b.external_service ? 1 : 0) - (a.external_service ? 1 : 0))
      default:
        return sorted.sort((a, b) => (b.total_service_time || 0) - (a.total_service_time || 0))
    }
  }

  const getSortedAnalysts = (analysts, sortBy) => {
    if (!analysts) return []
    
    const sorted = [...analysts]
    switch (sortBy) {
      case 'ticket_count':
        return sorted.sort((a, b) => b.ticket_count - a.ticket_count)
      case 'total_hours':
        return sorted.sort((a, b) => b.total_hours - a.total_hours)
      case 'avg_hours_per_ticket':
        return sorted.sort((a, b) => a.avg_hours_per_ticket - b.avg_hours_per_ticket) // menor é melhor
      default:
        return sorted.sort((a, b) => b.ticket_count - a.ticket_count)
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Ranking de Performance - {selectedPeriod}
                    </CardTitle>
                    <CardDescription>
                      Classificação dos analistas por performance no período
                      <div className="flex items-center gap-2 mt-2 p-2 bg-muted rounded-lg">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        <div className="text-xs">
                          <strong>Critérios por Horas:</strong> 🏆 Excelente (140h+) | ⭐ Bom (120-140h) | 📊 Regular (100-120h) | 📈 Abaixo da média (&lt;100h)
                        </div>
                      </div>
                    </CardDescription>
                  </div>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ticket_count">Número de Chamados</SelectItem>
                      <SelectItem value="total_hours">Horas Trabalhadas</SelectItem>
                      <SelectItem value="avg_hours_per_ticket">Média por Chamado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pos.</TableHead>
                        <TableHead>Analista</TableHead>
                        <TableHead>Chamados</TableHead>
                        <TableHead>Horas Totais</TableHead>
                        <TableHead>Deslocamentos</TableHead>
                        <TableHead>Média/Chamado</TableHead>
                        <TableHead>Performance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getSortedAnalysts(technicianData.performance_data, sortBy)?.map((analyst, index) => {
                        const performance = getPerformanceLevel(analyst, technicianData.performance_data)
                        return (
                          <TableRow 
                            key={analyst.technician}
                            className={`cursor-pointer transition-all ${
                              selectedAnalyst === analyst.technician 
                                ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                            onClick={() => setSelectedAnalyst(analyst.technician)}
                          >
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
                            <TableCell>
                              <div className="font-semibold text-lg">{analyst.technician}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-lg font-semibold text-blue-600">{analyst.ticket_count}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-lg font-semibold text-green-600">
                                {formatHoursToHoursMinutes(analyst.total_hours)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-lg font-semibold text-purple-600">{analyst.external_services_count || 0}</div>
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
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Deslocamentos</CardTitle>
                          <UserCheck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-purple-600">
                            {analyst?.external_services_count || 0}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Atendimentos externos
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
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Chamados Atendidos por {selectedAnalyst}</CardTitle>
                          <CardDescription>
                            Detalhamento dos chamados no período {selectedPeriod}
                          </CardDescription>
                        </div>
                        <Select value={ticketTableSort} onValueChange={setTicketTableSort}>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Ordenar por" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="time_desc">Tempo (Maior → Menor)</SelectItem>
                            <SelectItem value="time_asc">Tempo (Menor → Maior)</SelectItem>
                            <SelectItem value="ticket_id">ID do Ticket</SelectItem>
                            <SelectItem value="client_name">Cliente</SelectItem>
                            <SelectItem value="external_first">Deslocamentos Primeiro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
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
                              <TableHead>Tipo</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(() => {
                              const sortedTickets = getSortedTickets(analystDetails.tickets, ticketTableSort)
                              const startIndex = (ticketTablePage - 1) * ticketsPerPage
                              const endIndex = startIndex + ticketsPerPage
                              const paginatedTickets = sortedTickets.slice(startIndex, endIndex)
                              
                              return paginatedTickets.map((ticket) => (
                                <TableRow key={ticket.ticket_id}>
                                  <TableCell className="font-medium">{ticket.ticket_id}</TableCell>
                                  <TableCell>{ticket.client_name}</TableCell>
                                  <TableCell className="max-w-xs truncate">{ticket.subject || '-'}</TableCell>
                                  <TableCell>{formatHoursToHoursMinutes(ticket.total_service_time)}</TableCell>
                                  <TableCell>
                                    {ticket.external_service ? (
                                      <Badge className="bg-purple-100 text-purple-800">Deslocamento</Badge>
                                    ) : (
                                      <Badge variant="outline">Interno</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{ticket.status || 'N/A'}</Badge>
                                  </TableCell>
                                </TableRow>
                              ))
                            })()}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {/* Paginação */}
                      {analystDetails.tickets?.length > ticketsPerPage && (
                        <div className="flex items-center justify-between mt-4">
                          <div className="text-sm text-muted-foreground">
                            Mostrando {((ticketTablePage - 1) * ticketsPerPage) + 1} a {Math.min(ticketTablePage * ticketsPerPage, analystDetails.tickets.length)} de {analystDetails.tickets.length} chamados
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setTicketTablePage(Math.max(1, ticketTablePage - 1))}
                              disabled={ticketTablePage === 1}
                            >
                              Anterior
                            </Button>
                            <span className="text-sm">
                              Página {ticketTablePage} de {Math.ceil(analystDetails.tickets.length / ticketsPerPage)}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setTicketTablePage(Math.min(Math.ceil(analystDetails.tickets.length / ticketsPerPage), ticketTablePage + 1))}
                              disabled={ticketTablePage >= Math.ceil(analystDetails.tickets.length / ticketsPerPage)}
                            >
                              Próxima
                            </Button>
                          </div>
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Comparativo de Performance</CardTitle>
                    <CardDescription>
                      Análise comparativa entre todos os analistas no período
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={comparisonMode === 'tickets' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setComparisonMode('tickets')}
                    >
                      Por Chamados
                    </Button>
                    <Button
                      variant={comparisonMode === 'hours' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setComparisonMode('hours')}
                    >
                      Por Horas
                    </Button>
                  </div>
                </div>
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
                        <TableHead>Deslocamentos</TableHead>
                        <TableHead>Média/Chamado</TableHead>
                        <TableHead>Performance</TableHead>
                        <TableHead>% do Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getSortedAnalysts(
                        technicianData.performance_data, 
                        comparisonMode === 'tickets' ? 'ticket_count' : 'total_hours'
                      )?.map((analyst, index) => {
                        const performance = getPerformanceLevel(analyst, technicianData.performance_data)
                        const totalBase = comparisonMode === 'tickets' 
                          ? technicianData.performance_data.reduce((sum, a) => sum + a.ticket_count, 0)
                          : technicianData.performance_data.reduce((sum, a) => sum + a.total_hours, 0)
                        const analystValue = comparisonMode === 'tickets' ? analyst.ticket_count : analyst.total_hours
                        const percentage = ((analystValue / totalBase) * 100).toFixed(1)
                        
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
                              <div className={`text-lg font-semibold ${comparisonMode === 'tickets' ? 'text-blue-600' : ''}`}>
                                {analyst.ticket_count}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={`text-lg font-semibold ${comparisonMode === 'hours' ? 'text-green-600' : 'text-green-600'}`}>
                                {formatHoursToHoursMinutes(analyst.total_hours)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-lg font-semibold text-purple-600">
                                {analyst.external_services_count || 0}
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
                                  className={`h-2 rounded-full ${comparisonMode === 'tickets' ? 'bg-blue-600' : 'bg-green-600'}`}
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