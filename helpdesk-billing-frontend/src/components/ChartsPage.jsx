import { useState, useEffect } from 'react'
import axios from 'axios'
import ReactECharts from 'echarts-for-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Loader2, BarChart3, PieChart, TrendingUp, AlertCircle } from 'lucide-react'

const ChartsPage = () => {
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
      loadData(parseInt(month), parseInt(year))
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

  const loadData = async (month, year) => {
    setLoading(true)
    setError(null)
    try {
      const [statsResponse, billingResponse] = await Promise.all([
        axios.get(`/api/statistics/${month}/${year}`),
        axios.get(`/api/billing/${month}/${year}`)
      ])
      setStatistics(statsResponse.data)
      setBilling(billingResponse.data)
    } catch (err) {
      setError('Erro ao carregar dados para os gráficos')
    } finally {
      setLoading(false)
    }
  }

  // Configuração do gráfico de horas por cliente
  const getClientHoursChartOption = () => {
    if (!statistics?.hours_by_client) return {}

    const data = Object.entries(statistics.hours_by_client)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)

    return {
      title: {
        text: 'Top 10 Clientes por Horas Consumidas',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: function(params) {
          return `${params[0].name}<br/>Horas: ${params[0].value.toFixed(2)}h`
        }
      },
      xAxis: {
        type: 'category',
        data: data.map(([name]) => name),
        axisLabel: {
          rotate: 45,
          interval: 0
        }
      },
      yAxis: {
        type: 'value',
        name: 'Horas'
      },
      series: [{
        name: 'Horas',
        type: 'bar',
        data: data.map(([, hours]) => hours),
        itemStyle: {
          color: '#3b82f6'
        }
      }]
    }
  }

  // Configuração do gráfico de faturamento por cliente
  const getBillingChartOption = () => {
    if (!billing?.clients) return {}

    const data = billing.clients
      .sort((a, b) => b.total_value - a.total_value)
      .slice(0, 10)

    return {
      title: {
        text: 'Top 10 Clientes por Faturamento',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: function(params) {
          const value = params[0].value
          return `${params[0].name}<br/>Faturamento: R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
        }
      },
      xAxis: {
        type: 'category',
        data: data.map(client => client.client_name),
        axisLabel: {
          rotate: 45,
          interval: 0
        }
      },
      yAxis: {
        type: 'value',
        name: 'Valor (R$)',
        axisLabel: {
          formatter: function(value) {
            return 'R$ ' + value.toLocaleString('pt-BR')
          }
        }
      },
      series: [{
        name: 'Faturamento',
        type: 'bar',
        data: data.map(client => client.total_value),
        itemStyle: {
          color: '#10b981'
        }
      }]
    }
  }

  // Configuração do gráfico de pizza - categorias
  const getCategoriesPieChartOption = () => {
    if (!statistics?.primary_categories) return {}

    const data = Object.entries(statistics.primary_categories)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }))

    return {
      title: {
        text: 'Distribuição por Categoria Primária',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left'
      },
      series: [{
        name: 'Categorias',
        type: 'pie',
        radius: '50%',
        data: data,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    }
  }

  // Configuração do gráfico de performance dos técnicos
  const getTechniciansChartOption = () => {
    if (!statistics?.hours_by_technician) return {}

    const technicians = Object.keys(statistics.hours_by_technician)
    const hours = technicians.map(tech => statistics.hours_by_technician[tech])
    const tickets = technicians.map(tech => statistics.tickets_by_technician?.[tech] || 0)
    const externalServices = technicians.map(tech => statistics.external_services_by_technician?.[tech] || 0)

    return {
      title: {
        text: 'Performance dos Técnicos',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        }
      },
      legend: {
        data: ['Horas', 'Tickets', 'Atend. Externos'],
        top: 30
      },
      xAxis: {
        type: 'category',
        data: technicians,
        axisLabel: {
          rotate: 45
        }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Horas',
          position: 'left'
        },
        {
          type: 'value',
          name: 'Quantidade',
          position: 'right'
        }
      ],
      series: [
        {
          name: 'Horas',
          type: 'bar',
          yAxisIndex: 0,
          data: hours,
          itemStyle: {
            color: '#3b82f6'
          }
        },
        {
          name: 'Tickets',
          type: 'line',
          yAxisIndex: 1,
          data: tickets,
          itemStyle: {
            color: '#f59e0b'
          }
        },
        {
          name: 'Atend. Externos',
          type: 'line',
          yAxisIndex: 1,
          data: externalServices,
          itemStyle: {
            color: '#ef4444'
          }
        }
      ]
    }
  }

  // Configuração do gráfico de horas contratuais vs utilizadas
  const getContractUsageChartOption = () => {
    if (!billing?.clients) return {}

    const data = billing.clients.slice(0, 10)
    const clientNames = data.map(client => client.client_name)
    const contractHours = data.map(client => client.contract_hours)
    const usedHours = data.map(client => client.total_hours)
    const overtimeHours = data.map(client => client.overtime_hours)

    return {
      title: {
        text: 'Utilização de Horas Contratuais',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        data: ['Horas Contratuais', 'Horas Utilizadas', 'Horas Excedentes'],
        top: 30
      },
      xAxis: {
        type: 'category',
        data: clientNames,
        axisLabel: {
          rotate: 45,
          interval: 0
        }
      },
      yAxis: {
        type: 'value',
        name: 'Horas'
      },
      series: [
        {
          name: 'Horas Contratuais',
          type: 'bar',
          data: contractHours,
          itemStyle: {
            color: '#6b7280'
          }
        },
        {
          name: 'Horas Utilizadas',
          type: 'bar',
          data: usedHours,
          itemStyle: {
            color: '#3b82f6'
          }
        },
        {
          name: 'Horas Excedentes',
          type: 'bar',
          data: overtimeHours,
          itemStyle: {
            color: '#ef4444'
          }
        }
      ]
    }
  }

  if (loading && !statistics) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando gráficos...</span>
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
            Gráficos e Análises
          </CardTitle>
          <CardDescription>
            Visualizações interativas dos dados de faturamento e performance
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

      {statistics && billing && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Horas por Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Horas por Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReactECharts
                option={getClientHoursChartOption()}
                style={{ height: '400px' }}
              />
            </CardContent>
          </Card>

          {/* Gráfico de Faturamento por Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Faturamento por Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReactECharts
                option={getBillingChartOption()}
                style={{ height: '400px' }}
              />
            </CardContent>
          </Card>

          {/* Gráfico de Pizza - Categorias */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Distribuição por Categoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReactECharts
                option={getCategoriesPieChartOption()}
                style={{ height: '400px' }}
              />
            </CardContent>
          </Card>

          {/* Gráfico de Performance dos Técnicos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance dos Técnicos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReactECharts
                option={getTechniciansChartOption()}
                style={{ height: '400px' }}
              />
            </CardContent>
          </Card>

          {/* Gráfico de Utilização de Horas Contratuais */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Utilização de Horas Contratuais
              </CardTitle>
              <CardDescription>
                Comparação entre horas contratuais, utilizadas e excedentes por cliente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReactECharts
                option={getContractUsageChartOption()}
                style={{ height: '500px' }}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {!statistics && !loading && periods.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum dado disponível</h3>
            <p className="text-muted-foreground">
              Faça upload de um arquivo Excel na aba "Upload de Dados" para visualizar os gráficos
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ChartsPage
