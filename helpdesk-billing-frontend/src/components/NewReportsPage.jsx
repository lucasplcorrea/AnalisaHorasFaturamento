import { useState, useEffect } from 'react'
import axios from 'axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Checkbox } from '@/components/ui/checkbox.jsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { FileText, Download, Loader2, AlertCircle, CheckCircle, Clock, Archive, ArrowUpDown, Star, FileBarChart } from 'lucide-react'
import { formatHoursToHoursMinutes, formatCurrency, formatDate } from '@/lib/formatters.js'

const NewReportsPage = () => {
  const [periods, setPeriods] = useState([])
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [billing, setBilling] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [generatingPdf, setGeneratingPdf] = useState(null)
  const [selectedClients, setSelectedClients] = useState([])
  const [selectAll, setSelectAll] = useState(false)
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [existingReports, setExistingReports] = useState([])

  useEffect(() => {
    loadPeriods()
  }, [])

  useEffect(() => {
    if (selectedPeriod) {
      const [month, year] = selectedPeriod.split('/')
      loadBilling(parseInt(month), parseInt(year))
      loadExistingReports(parseInt(month), parseInt(year))
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

  const loadBilling = async (month, year) => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get(`/api/billing/${month}/${year}`)
      setBilling(response.data)
    } catch (err) {
      setError('Erro ao carregar dados de faturamento')
    } finally {
      setLoading(false)
    }
  }

  const loadExistingReports = async (month, year) => {
    try {
      const response = await axios.get(`/api/list-reports/${month}/${year}`)
      setExistingReports(response.data.reports || [])
    } catch (err) {
      console.error('Erro ao carregar relatórios existentes:', err)
    }
  }

  const generateClientPdf = async (clientName) => {
    setGeneratingPdf(clientName)
    try {
      const [month, year] = selectedPeriod.split('/')
      
      const response = await axios.get(`/api/generate-pdf/${encodeURIComponent(clientName)}/${month}/${year}`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      
      const safeClientName = clientName.replace(/[^a-zA-Z0-9]/g, '_')
      const filename = `fatura_${safeClientName}_${month}_${year}.pdf`
      link.setAttribute('download', filename)
      
      document.body.appendChild(link)
      link.click()
      link.remove()
      
      window.URL.revokeObjectURL(url)
      setError(null)
      
      // Recarregar lista de relatórios
      loadExistingReports(parseInt(month), parseInt(year))
      
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao gerar PDF do cliente')
    } finally {
      setGeneratingPdf(null)
    }
  }

  const generateOverviewPdf = async () => {
    setGeneratingPdf('overview')
    try {
      const [month, year] = selectedPeriod.split('/')
      
      const response = await axios.get(`/api/generate-summary-pdf/${month}/${year}`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      
      const filename = `overview_faturamento_${month}_${year}.pdf`
      link.setAttribute('download', filename)
      
      document.body.appendChild(link)
      link.click()
      link.remove()
      
      window.URL.revokeObjectURL(url)
      setError(null)
      
      // Recarregar lista de relatórios
      loadExistingReports(parseInt(month), parseInt(year))
      
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao gerar PDF de overview')
    } finally {
      setGeneratingPdf(null)
    }
  }

  const generateAllPdfs = async () => {
    setGeneratingPdf('all')
    try {
      const [month, year] = selectedPeriod.split('/')
      
      const response = await axios.post(`/api/generate-all-pdfs/${month}/${year}`)
      
      if (response.data.success) {
        setError(null)
        alert(`${response.data.generated_files} relatórios PDF gerados com sucesso!`)
        
        // Recarregar lista de relatórios
        loadExistingReports(parseInt(month), parseInt(year))
      } else {
        setError('Erro ao gerar alguns relatórios')
      }
      
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao gerar relatórios em lote')
    } finally {
      setGeneratingPdf(null)
    }
  }

  const generateSelectedZip = async () => {
    if (selectedClients.length === 0) {
      setError('Selecione pelo menos um cliente para gerar o ZIP')
      return
    }

    setGeneratingPdf('zip')
    try {
      const [month, year] = selectedPeriod.split('/')
      
      const response = await axios.post(`/api/generate-selected-zip/${month}/${year}`, {
        clients: selectedClients
      }, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      
      const filename = `faturas_selecionadas_${month}_${year}.zip`
      link.setAttribute('download', filename)
      
      document.body.appendChild(link)
      link.click()
      link.remove()
      
      window.URL.revokeObjectURL(url)
      setError(null)
      
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao gerar ZIP dos relatórios selecionados')
    } finally {
      setGeneratingPdf(null)
    }
  }

  const handleSelectAll = (checked) => {
    setSelectAll(checked)
    if (checked) {
      setSelectedClients(billing?.clients?.map(client => client.client_name) || [])
    } else {
      setSelectedClients([])
    }
  }

  const handleClientSelect = (clientName, checked) => {
    if (checked) {
      setSelectedClients(prev => [...prev, clientName])
    } else {
      setSelectedClients(prev => prev.filter(name => name !== clientName))
      setSelectAll(false)
    }
  }

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const getSortedClients = () => {
    if (!billing?.clients) return []

    const sorted = [...billing.clients].sort((a, b) => {
      let aValue, bValue

      switch (sortBy) {
        case 'name':
          aValue = a.client_name.toLowerCase()
          bValue = b.client_name.toLowerCase()
          break
        case 'hours':
          aValue = a.total_hours || 0
          bValue = b.total_hours || 0
          break
        case 'value':
          aValue = a.total_value || 0
          bValue = b.total_value || 0
          break
        default:
          return 0
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return sorted
  }

  const getSortIcon = (field) => {
    if (sortBy !== field) return <ArrowUpDown className="h-4 w-4" />
    return sortOrder === 'asc' 
      ? <ArrowUpDown className="h-4 w-4 text-blue-600" />
      : <ArrowUpDown className="h-4 w-4 text-blue-600 rotate-180" />
  }

  const downloadExistingReport = async (report) => {
    try {
      const response = await axios.get(`/api/download-pdf/reports/${report.filename}`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', report.filename)
      
      document.body.appendChild(link)
      link.click()
      link.remove()
      
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Erro ao fazer download do relatório')
    }
  }

  if (loading && !billing) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando relatórios...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Relatórios</h1>
          <p className="text-gray-600 dark:text-gray-400">Geração e gestão de relatórios de faturamento</p>
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

      {billing && (
        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="generate">Gerar Relatórios</TabsTrigger>
            <TabsTrigger value="existing">Relatórios Existentes</TabsTrigger>
            <TabsTrigger value="overview">Overview Executivo</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6">
            {/* Resumo do Período */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileBarChart className="h-5 w-5" />
                  Resumo do Período - {selectedPeriod}
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
                    <p className="text-sm text-muted-foreground">Total de Horas</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatHoursToHoursMinutes(billing.summary?.total_hours)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Horas Excedentes</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatHoursToHoursMinutes(billing.summary?.total_overtime_hours)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ações Rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Relatório Overview
                  </CardTitle>
                  <CardDescription>
                    Relatório executivo com visão geral do período
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={generateOverviewPdf} 
                    disabled={generatingPdf}
                    className="w-full"
                    size="lg"
                  >
                    {generatingPdf === 'overview' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Gerando Overview...
                      </>
                    ) : (
                      <>
                        <FileBarChart className="h-4 w-4 mr-2" />
                        Gerar Overview PDF
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Todos os Relatórios
                  </CardTitle>
                  <CardDescription>
                    Gerar PDFs individuais para todos os clientes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={generateAllPdfs} 
                    disabled={generatingPdf}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    {generatingPdf === 'all' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Gerando PDFs...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Gerar Todos os PDFs
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Archive className="h-5 w-5" />
                    Seleção Personalizada
                  </CardTitle>
                  <CardDescription>
                    Baixar ZIP com clientes selecionados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={generateSelectedZip} 
                    disabled={generatingPdf || selectedClients.length === 0}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    {generatingPdf === 'zip' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Gerando ZIP...
                      </>
                    ) : (
                      <>
                        <Archive className="h-4 w-4 mr-2" />
                        Baixar Selecionados ({selectedClients.length})
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Lista de Clientes para Faturamento */}
            <Card>
              <CardHeader>
                <CardTitle>Faturamento por Cliente</CardTitle>
                <CardDescription>
                  Selecione os clientes para download em ZIP ou gere PDFs individuais
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectAll}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center gap-2">
                            Cliente
                            {getSortIcon('name')}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer"
                          onClick={() => handleSort('hours')}
                        >
                          <div className="flex items-center gap-2">
                            Horas Utilizadas
                            {getSortIcon('hours')}
                          </div>
                        </TableHead>
                        <TableHead>Horas Excedentes</TableHead>
                        <TableHead>Atend. Externos</TableHead>
                        <TableHead 
                          className="cursor-pointer"
                          onClick={() => handleSort('value')}
                        >
                          <div className="flex items-center gap-2">
                            Valor Total
                            {getSortIcon('value')}
                          </div>
                        </TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getSortedClients().map((client) => (
                        <TableRow key={client.client_name}>
                          <TableCell>
                            <Checkbox
                              checked={selectedClients.includes(client.client_name)}
                              onCheckedChange={(checked) => handleClientSelect(client.client_name, checked)}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{client.client_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {client.tickets?.length || 0} tickets
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{formatHoursToHoursMinutes(client.total_hours)}</span>
                              {client.total_hours > client.contract_hours && (
                                <Badge variant="destructive" className="text-xs">
                                  Excedeu
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={client.overtime_hours > 0 ? 'text-orange-600 font-medium' : ''}>
                              {formatHoursToHoursMinutes(client.overtime_hours)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{client.external_services || 0}</span>
                              {client.external_services > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  Externos
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-green-600">
                              {formatCurrency(client.total_value)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => generateClientPdf(client.client_name)}
                              disabled={generatingPdf === client.client_name}
                            >
                              {generatingPdf === client.client_name ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="existing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Relatórios Disponíveis - {selectedPeriod}</CardTitle>
                <CardDescription>
                  PDFs gerados anteriormente para download
                </CardDescription>
              </CardHeader>
              <CardContent>
                {existingReports.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome do Arquivo</TableHead>
                          <TableHead>Cliente/Tipo</TableHead>
                          <TableHead>Tamanho</TableHead>
                          <TableHead>Data de Criação</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {existingReports.map((report) => (
                          <TableRow key={report.filename}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {report.report_type === 'summary' ? (
                                  <Star className="h-4 w-4 text-yellow-500" />
                                ) : (
                                  <FileText className="h-4 w-4 text-blue-500" />
                                )}
                                {report.filename}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{report.client_name}</div>
                                <Badge variant={report.report_type === 'summary' ? 'default' : 'outline'}>
                                  {report.report_type === 'summary' ? 'Overview' : 'Cliente'}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              {(report.file_size / 1024).toFixed(1)} KB
                            </TableCell>
                            <TableCell>
                              {formatDate(report.created_at)}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                onClick={() => downloadExistingReport(report)}
                                variant="outline"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum relatório encontrado</h3>
                    <p className="text-muted-foreground">
                      Gere relatórios na aba "Gerar Relatórios" para visualizá-los aqui
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-6 w-6 text-yellow-500" />
                  Relatório Overview Executivo
                </CardTitle>
                <CardDescription>
                  O relatório mais importante: visão completa do período para tomada de decisões
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">O que inclui o Overview:</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Resumo financeiro do período
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Performance por cliente
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Análise de horas contratuais vs utilizadas
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Estatísticas da equipe técnica
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Tendências e insights do período
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3">Ideal para:</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        Apresentações executivas
                      </li>
                      <li className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        Análise de rentabilidade
                      </li>
                      <li className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        Planejamento estratégico
                      </li>
                      <li className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        Tomada de decisões
                      </li>
                    </ul>
                  </div>
                </div>
                
                <div className="flex justify-center pt-4">
                  <Button 
                    onClick={generateOverviewPdf} 
                    disabled={generatingPdf}
                    size="lg"
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                  >
                    {generatingPdf === 'overview' ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Gerando Overview...
                      </>
                    ) : (
                      <>
                        <Star className="h-5 w-5 mr-2" />
                        Gerar Relatório Overview Executivo
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Prévia das Métricas do Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Prévia das Métricas - {selectedPeriod}</CardTitle>
                <CardDescription>
                  Principais indicadores que serão incluídos no relatório overview
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(billing.summary?.total_value || 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Receita Total</div>
                  </div>
                  
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {billing.summary?.total_clients || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Clientes Ativos</div>
                  </div>
                  
                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {formatHoursToHoursMinutes(billing.summary?.total_hours)}
                    </div>
                    <div className="text-sm text-muted-foreground">Horas Trabalhadas</div>
                  </div>
                  
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {((billing.summary?.total_overtime_hours / billing.summary?.total_hours * 100) || 0).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Taxa Overtime</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {!billing && !loading && periods.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum dado disponível</h3>
            <p className="text-muted-foreground">
              Faça upload de um arquivo Excel para gerar relatórios
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default NewReportsPage