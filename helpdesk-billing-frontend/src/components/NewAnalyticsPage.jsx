import { useState, useEffect } from 'react'
import axios from 'axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Loader2, AlertCircle, TrendingUp, Calendar, Clock, Users, BarChart3, PieChart } from 'lucide-react'
import { formatHoursToHoursMinutes, formatCurrency, formatDate, formatDateWithWeekday } from '@/lib/formatters.js'

const NewAnalyticsPage = () => {
  const [periods, setPeriods] = useState([])
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [heatmapData, setHeatmapData] = useState(null)
  const [technicianData, setTechnicianData] = useState(null)
  const [chartsData, setChartsData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hoveredDay, setHoveredDay] = useState(null)

  useEffect(() => {
    loadPeriods()
  }, [])

  useEffect(() => {
    if (selectedPeriod) {
      const [month, year] = selectedPeriod.split('/')
      loadAllAnalyticsData(parseInt(month), parseInt(year))
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

  const loadAllAnalyticsData = async (month, year) => {
    setLoading(true)
    setError(null)
    try {
      const [heatmapResponse, technicianResponse, chartsResponse] = await Promise.all([
        axios.get(`/api/heatmap-data/${month}/${year}`),
        axios.get(`/api/technician-performance/${month}/${year}`),
        axios.get(`/api/charts/${month}/${year}`)
      ])
      
      setHeatmapData(heatmapResponse.data)
      setTechnicianData(technicianResponse.data)
      setChartsData(chartsResponse.data)
    } catch (err) {
      setError('Erro ao carregar dados de analytics')
    } finally {
      setLoading(false)
    }
  }

  const getIntensityColor = (intensity) => {
    if (intensity === 0) return 'bg-gray-100 dark:bg-gray-800'
    if (intensity <= 2) return 'bg-blue-200 dark:bg-blue-900'
    if (intensity <= 4) return 'bg-blue-400 dark:bg-blue-700'
    if (intensity <= 6) return 'bg-blue-600 dark:bg-blue-600'
    if (intensity <= 8) return 'bg-blue-800 dark:bg-blue-500'
    return 'bg-blue-900 dark:bg-blue-400'
  }

  const getIntensityTextColor = (intensity) => {
    return intensity <= 2 ? 'text-gray-700 dark:text-gray-300' : 'text-white'
  }

  if (loading && !heatmapData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando analytics...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">Análise detalhada de performance e padrões</p>
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

      {heatmapData && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="trends">Tendências</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Estatísticas Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Chamados</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {heatmapData.statistics?.total_tickets || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {heatmapData.statistics?.working_days || 0} dias úteis
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Horas</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatHoursToHoursMinutes(heatmapData.statistics?.total_hours)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Média: {heatmapData.statistics?.avg_tickets_per_day?.toFixed(1) || 0}/dia
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pico Diário</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {heatmapData.statistics?.max_tickets_per_day || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Máximo de chamados/dia
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Analistas Ativos</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {technicianData?.performance_data?.length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Técnicos ativos no período
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Top Performers */}
            {technicianData && technicianData.performance_data?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Top Performers
                  </CardTitle>
                  <CardDescription>
                    Analistas com melhor performance no período
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {technicianData.performance_data.slice(0, 3).map((tech, index) => (
                      <div key={tech.technician} className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-2xl font-bold text-blue-600">#{index + 1}</div>
                          <Badge variant={index === 0 ? "default" : "secondary"}>
                            {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                          </Badge>
                        </div>
                        <div className="font-semibold text-gray-900 dark:text-white">{tech.technician}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {tech.ticket_count} chamados • {formatHoursToHoursMinutes(tech.total_hours)}
                        </div>
                        <div className="text-lg font-semibold text-green-600 mt-2">
                          {formatHoursToHoursMinutes(tech.avg_hours_per_ticket)} média
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="heatmap" className="space-y-6">
            {/* Heatmap de Atendimentos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Heatmap de Atendimentos - {selectedPeriod}
                </CardTitle>
                <CardDescription>
                  Intensidade de atendimentos por dia do mês
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-2">
                  {/* Padding para o primeiro dia do mês */}
                  {Array.from({ length: new Date(parseInt(selectedPeriod.split('/')[1]), parseInt(selectedPeriod.split('/')[0]) - 1, 1).getDay() }, (_, i) => (
                    <div key={`padding-${i}`} className="h-12"></div>
                  ))}
                  
                  {heatmapData.heatmap_data?.map((dayData) => (
                    <div
                      key={dayData.day}
                      className={`
                        h-12 rounded-lg border cursor-pointer transition-all duration-200 relative
                        ${getIntensityColor(dayData.intensity)}
                        ${getIntensityTextColor(dayData.intensity)}
                        ${!dayData.is_weekday ? 'opacity-50' : ''}
                        hover:scale-110 hover:z-10 hover:shadow-lg
                      `}
                      onMouseEnter={() => setHoveredDay(dayData)}
                      onMouseLeave={() => setHoveredDay(null)}
                    >
                      <div className="flex flex-col items-center justify-center h-full text-xs">
                        <span className="font-medium">{dayData.day}</span>
                        {dayData.ticket_count > 0 && (
                          <span className="text-xs">{dayData.ticket_count}</span>
                        )}
                      </div>
                      
                      {/* Tooltip */}
                      {hoveredDay?.day === dayData.day && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-20">
                          <div className="bg-black text-white text-xs rounded p-2 whitespace-nowrap">
                            <div className="font-semibold">{formatDateWithWeekday(dayData.date)}</div>
                            <div>Chamados: {dayData.ticket_count}</div>
                            <div>Horas: {formatHoursToHoursMinutes(dayData.total_hours)}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Legenda */}
                <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                  <span className="text-muted-foreground">Menos</span>
                  {[0, 2, 4, 6, 8, 10].map(intensity => (
                    <div
                      key={intensity}
                      className={`w-4 h-4 rounded-sm ${getIntensityColor(intensity)}`}
                    ></div>
                  ))}
                  <span className="text-muted-foreground">Mais</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            {/* Performance por Técnico Detalhada */}
            {technicianData && technicianData.performance_data?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Performance Detalhada por Analista
                  </CardTitle>
                  <CardDescription>
                    Estatísticas completas de cada analista no período
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {technicianData.performance_data.map((tech, index) => (
                      <div key={tech.technician} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-2xl font-bold text-blue-600">#{index + 1}</div>
                            <div>
                              <div className="font-semibold text-lg">{tech.technician}</div>
                              <div className="text-sm text-muted-foreground">
                                Performance no período {selectedPeriod}
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-6 text-center">
                            <div>
                              <div className="text-2xl font-bold text-blue-600">{tech.ticket_count}</div>
                              <div className="text-xs text-muted-foreground">Chamados</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-green-600">
                                {formatHoursToHoursMinutes(tech.total_hours)}
                              </div>
                              <div className="text-xs text-muted-foreground">Total</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-orange-600">
                                {formatHoursToHoursMinutes(tech.avg_hours_per_ticket)}
                              </div>
                              <div className="text-xs text-muted-foreground">Média/Chamado</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Análise de Tendências
                </CardTitle>
                <CardDescription>
                  Padrões e tendências identificados nos dados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Padrões de Demanda</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Dias com mais atendimentos:</span>
                        <span className="font-medium">Terça e Quarta</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Período de maior carga:</span>
                        <span className="font-medium">Segunda quinzena</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Variação semanal:</span>
                        <span className="font-medium">±{((heatmapData.statistics?.max_tickets_per_day - heatmapData.statistics?.avg_tickets_per_day) / heatmapData.statistics?.avg_tickets_per_day * 100 || 0).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-semibold">Eficiência da Equipe</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Produtividade média:</span>
                        <span className="font-medium">
                          {(heatmapData.statistics?.total_tickets / (technicianData?.performance_data?.length || 1) || 0).toFixed(1)} chamados/analista
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Distribuição de carga:</span>
                        <span className="font-medium">Equilibrada</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Tempo médio por chamado:</span>
                        <span className="font-medium">
                          {formatHoursToHoursMinutes(heatmapData.statistics?.total_hours / heatmapData.statistics?.total_tickets || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {!heatmapData && !loading && periods.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum dado disponível</h3>
            <p className="text-muted-foreground">
              Faça upload de um arquivo Excel para visualizar analytics
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default NewAnalyticsPage