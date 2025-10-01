import { useState, useEffect } from 'react'
import axios from 'axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx'
import { FileText, Download, Loader2, AlertCircle, CheckCircle, Clock, ExternalLink, TrendingUp } from 'lucide-react'

const ReportsPage = () => {
  const [periods, setPeriods] = useState([])
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [billing, setBilling] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [generatingPdf, setGeneratingPdf] = useState(null)

  useEffect(() => {
    loadPeriods()
  }, [])

  useEffect(() => {
    if (selectedPeriod) {
      const [month, year] = selectedPeriod.split('/')
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

  const generatePdf = async (clientName) => {
    setGeneratingPdf(clientName)
    try {
      const [month, year] = selectedPeriod.split('/')
      
      const response = await axios.get(`/api/generate-pdf/${encodeURIComponent(clientName)}/${month}/${year}`, {
        responseType: 'blob'
      })
      
      // Criar URL para download
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      
      // Definir nome do arquivo
      const filename = `fatura_${clientName.replace(/\s+/g, '_')}_${month}_${year}.pdf`
      link.setAttribute('download', filename)
      
      // Fazer download
      document.body.appendChild(link)
      link.click()
      link.remove()
      
      // Limpar URL
      window.URL.revokeObjectURL(url)
      
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao gerar PDF')
    } finally {
      setGeneratingPdf(null)
    }
  }

  const generateAllPdfs = async () => {
    if (!billing?.clients) return
    
    setGeneratingPdf('all')
    try {
      const [month, year] = selectedPeriod.split('/')
      
      const response = await axios.post(`/api/generate-all-pdfs/${month}/${year}`)
      
      if (response.data.success) {
        // Mostrar mensagem de sucesso
        setError(null)
        alert(`${response.data.generated_files} relatórios PDF gerados com sucesso!`)
        
        // Opcionalmente, você pode implementar download em lote aqui
        // ou mostrar uma lista de arquivos gerados para download individual
      } else {
        setError('Erro ao gerar alguns relatórios')
      }
      
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao gerar relatórios em lote')
    } finally {
      setGeneratingPdf(null)
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

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('pt-BR')
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
      {/* Cabeçalho */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Relatórios de Faturamento
          </CardTitle>
          <CardDescription>
            Gere relatórios individualizados em PDF para cada cliente
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
            {billing?.clients && billing.clients.length > 0 && (
              <Button
                onClick={generateAllPdfs}
                disabled={generatingPdf}
                className="ml-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                Gerar Todos os PDFs
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {billing && (
        <>
          {/* Resumo do Período */}
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
                    {formatHours(billing.summary?.total_hours)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Horas Excedentes</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatHours(billing.summary?.total_overtime_hours)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Clientes para Faturamento */}
          <Card>
            <CardHeader>
              <CardTitle>Faturamento por Cliente</CardTitle>
              <CardDescription>
                Clique em "Gerar PDF" para criar o relatório individual de cada cliente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Horas Utilizadas</TableHead>
                      <TableHead>Horas Excedentes</TableHead>
                      <TableHead>Atend. Externos</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billing.clients?.map((client) => (
                      <TableRow key={client.client_name}>
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
                            <span>{formatHours(client.total_hours)}</span>
                            {client.total_hours > client.contract_hours && (
                              <Badge variant="destructive" className="text-xs">
                                Excedeu
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={client.overtime_hours > 0 ? 'text-orange-600 font-medium' : ''}>
                            {formatHours(client.overtime_hours)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            <span>{client.external_services}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(client.total_value)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => generatePdf(client.client_name)}
                            disabled={generatingPdf === client.client_name}
                          >
                            {generatingPdf === client.client_name ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Gerando...
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-2" />
                                Gerar PDF
                              </>
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

          {/* Detalhamento de um Cliente (Expandível) */}
          {billing.clients && billing.clients.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Exemplo de Conteúdo do Relatório</CardTitle>
                <CardDescription>
                  Prévia do que será incluído no relatório PDF de cada cliente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3">
                      Relatório de Faturamento - {billing.clients[0].client_name}
                    </h4>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Período</p>
                        <p className="font-medium">{selectedPeriod}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Horas Contratuais</p>
                        <p className="font-medium">{formatHours(billing.clients[0].contract_hours)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Horas Utilizadas</p>
                        <p className="font-medium">{formatHours(billing.clients[0].total_hours)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Valor Total</p>
                        <p className="font-medium text-green-600">
                          {formatCurrency(billing.clients[0].total_value)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h5 className="font-medium">Detalhamento de Custos:</h5>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>Horas contratuais ({formatHours(billing.clients[0].used_contract_hours)} × {formatCurrency(billing.clients[0].rates?.hourly_rate)}):</span>
                          <span>{formatCurrency(billing.clients[0].contract_value)}</span>
                        </div>
                        {billing.clients[0].overtime_hours > 0 && (
                          <div className="flex justify-between">
                            <span>Horas excedentes ({formatHours(billing.clients[0].overtime_hours)} × {formatCurrency(billing.clients[0].rates?.overtime_rate)}):</span>
                            <span>{formatCurrency(billing.clients[0].overtime_value)}</span>
                          </div>
                        )}
                        {billing.clients[0].external_services > 0 && (
                          <div className="flex justify-between">
                            <span>Atendimentos externos ({billing.clients[0].external_services} × {formatCurrency(billing.clients[0].rates?.external_service_rate)}):</span>
                            <span>{formatCurrency(billing.clients[0].external_services_value)}</span>
                          </div>
                        )}
                        <div className="border-t pt-1 flex justify-between font-semibold">
                          <span>Total:</span>
                          <span>{formatCurrency(billing.clients[0].total_value)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <h5 className="font-medium mb-2">Lista de Chamados:</h5>
                      <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                        {billing.clients[0].tickets?.slice(0, 5).map((ticket, index) => (
                          <div key={index} className="flex justify-between border-b pb-1">
                            <span>{ticket.ticket_id} - {ticket.subject?.substring(0, 30)}...</span>
                            <span>{formatHours(ticket.total_service_time)}</span>
                          </div>
                        ))}
                        {billing.clients[0].tickets?.length > 5 && (
                          <p className="text-muted-foreground">
                            ... e mais {billing.clients[0].tickets.length - 5} chamados
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!billing && !loading && periods.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum dado disponível</h3>
            <p className="text-muted-foreground">
              Faça upload de um arquivo Excel na aba "Upload de Dados" para gerar relatórios
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ReportsPage
