import { useState, useEffect } from 'react'
import axios from 'axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Loader2, AlertCircle, TrendingUp, Calendar, Clock, Users, BarChart3 } from 'lucide-react'
import { formatHoursToHoursMinutes, formatCurrency, formatDate, formatDateWithWeekday } from '@/lib/formatters.js'

const AnalyticsPage = () => {
  const [periods, setPeriods] = useState([])
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [heatmapData, setHeatmapData] = useState(null)
  const [technicianData, setTechnicianData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hoveredDay, setHoveredDay] = useState(null)

  useEffect(() => {
    loadPeriods()
  }, [])

  useEffect(() => {
    if (selectedPeriod) {
      const [month, year] = selectedPeriod.split('/')
      loadAnalyticsData(parseInt(month), parseInt(year))
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

  const loadAnalyticsData = async (month, year) => {
    setLoading(true)
    setError(null)
    try {
      const [heatmapResponse, technicianResponse] = await Promise.all([
        axios.get(`/api/heatmap-data/${month}/${year}`),
        axios.get(`/api/technician-performance/${month}/${year}`)
      ])
      
      setHeatmapData(heatmapResponse.data)
      setTechnicianData(technicianResponse.data)
    } catch (err) {
      setError('Erro ao carregar dados de analytics')
    } finally {
      setLoading(false)
    }
  }

  const getIntensityColor = (intensity) => {
    if (intensity === 0) return 'bg-gray-100'
    if (intensity <= 2) return 'bg-blue-200'
    if (intensity <= 4) return 'bg-blue-400'
    if (intensity <= 6) return 'bg-blue-600'
    if (intensity <= 8) return 'bg-blue-800'
    return 'bg-blue-900'
  }

  const getIntensityTextColor = (intensity) => {
    return intensity <= 2 ? 'text-gray-700' : 'text-white'
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
      {/* Cabeçalho */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics e Relatórios Visuais
          </CardTitle>
          <CardDescription>
            Visualize padrões de atendimento e performance da equipe
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

      {heatmapData && (
        <>
          {/* Estatísticas Resumo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Resumo do Período - {selectedPeriod}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total de Chamados</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {heatmapData.statistics?.total_tickets || 0}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total de Horas</p>
                  <p className="text-2xl font-bold text-green-600">
                    {heatmapData.statistics?.total_hours || 0}h
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Máx. por Dia</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {heatmapData.statistics?.max_tickets_per_day || 0}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Média Diária</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {heatmapData.statistics?.avg_tickets_per_day?.toFixed(1) || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Heatmap de Atendimentos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Heatmap de Atendimentos Diários
              </CardTitle>
              <CardDescription>
                Intensidade de atendimentos por dia do mês (tons mais escuros = mais atendimentos)
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
                          <div>Horas: {dayData.total_hours}h</div>
                          {dayData.tickets.length > 0 && (
                            <div className="mt-1 max-h-20 overflow-y-auto">
                              {dayData.tickets.slice(0, 3).map((ticket, i) => (
                                <div key={i} className="text-xs text-gray-300">
                                  {ticket.ticket_id} - {ticket.client_name}
                                </div>
                              ))}
                              {dayData.tickets.length > 3 && (
                                <div className="text-xs text-gray-400">
                                  +{dayData.tickets.length - 3} mais...
                                </div>
                              )}
                            </div>
                          )}
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

          {/* Performance por Técnico */}
          {technicianData && technicianData.performance_data?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Performance por Técnico
                </CardTitle>
                <CardDescription>
                  Estatísticas de atendimento por membro da equipe
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {technicianData.performance_data.map((tech, index) => (
                    <div key={tech.technician} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl font-bold text-blue-600">#{index + 1}</div>
                        <div>
                          <div className="font-semibold">{tech.technician}</div>
                          <div className="text-sm text-muted-foreground">
                            {tech.ticket_count} chamados • {tech.total_hours}h trabalhadas
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold">{tech.avg_hours_per_ticket}h</div>
                        <div className="text-sm text-muted-foreground">média por chamado</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!heatmapData && !loading && periods.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum dado disponível</h3>
            <p className="text-muted-foreground">
              Faça upload de um arquivo Excel na aba "Upload de Dados" para visualizar analytics
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AnalyticsPage