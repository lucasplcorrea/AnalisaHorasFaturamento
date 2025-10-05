import { useState, useEffect } from 'react'
import axios from 'axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Checkbox } from '@/components/ui/checkbox.jsx'
import { useTheme } from '@/components/ThemeProvider.jsx'
import { 
  Upload, 
  Settings, 
  Trash2, 
  Database, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  Download,
  Info,
  Server,
  HardDrive,
  Users,
  Sun,
  Moon,
  Palette
} from 'lucide-react'
import { formatDate } from '@/lib/formatters.js'

const NewSettingsPage = () => {
  const { theme, toggleTheme } = useTheme()
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [error, setError] = useState(null)
  const [periods, setPeriods] = useState([])
  const [uploadBatches, setUploadBatches] = useState([])
  const [systemInfo, setSystemInfo] = useState({})
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingPeriod, setDeletingPeriod] = useState(null)
  const [deleting, setDeleting] = useState(false)
  
  // Novos estados para seleção de período
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [useManualPeriod, setUseManualPeriod] = useState(false)

  // Gerar listas de meses e anos
  const months = [
    { value: 1, label: '01 - Janeiro' },
    { value: 2, label: '02 - Fevereiro' },
    { value: 3, label: '03 - Março' },
    { value: 4, label: '04 - Abril' },
    { value: 5, label: '05 - Maio' },
    { value: 6, label: '06 - Junho' },
    { value: 7, label: '07 - Julho' },
    { value: 8, label: '08 - Agosto' },
    { value: 9, label: '09 - Setembro' },
    { value: 10, label: '10 - Outubro' },
    { value: 11, label: '11 - Novembro' },
    { value: 12, label: '12 - Dezembro' }
  ]

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  useEffect(() => {
    loadPeriods()
    loadUploadBatches()
    loadSystemInfo()
  }, [])

  const loadPeriods = async () => {
    try {
      const response = await axios.get('/api/periods')
      setPeriods(response.data || [])
    } catch (err) {
      console.error('Erro ao carregar períodos:', err)
    }
  }

  const loadUploadBatches = async () => {
    try {
      const response = await axios.get('/api/upload-batches')
      setUploadBatches(response.data.batches || [])
    } catch (err) {
      console.error('Erro ao carregar batches:', err)
    }
  }

  const loadSystemInfo = async () => {
    try {
      const response = await axios.get('/api/system-info')
      setSystemInfo(response.data.system_info || {})
    } catch (err) {
      console.error('Erro ao carregar informações do sistema:', err)
    }
  }

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        setError('Por favor, selecione um arquivo Excel (.xlsx ou .xls)')
        return
      }
      setFile(selectedFile)
      setError(null)
      setUploadResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Por favor, selecione um arquivo para upload')
      return
    }

    if (useManualPeriod && (!selectedMonth || !selectedYear)) {
      setError('Por favor, selecione o mês e ano quando usar período manual')
      return
    }

    setUploading(true)
    setError(null)
    setUploadResult(null)

    const formData = new FormData()
    formData.append('file', file)
    
    // Adicionar período se especificado manualmente
    if (useManualPeriod && selectedMonth && selectedYear) {
      formData.append('month', selectedMonth)
      formData.append('year', selectedYear)
    }

    try {
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setUploadResult(response.data)
      setFile(null)
      setSelectedMonth('')
      setSelectedYear('')
      setUseManualPeriod(false)
      
      // Reset file input
      document.getElementById('file-input').value = ''
      
      // Recarregar dados
      loadPeriods()
      loadUploadBatches()
      loadSystemInfo()

    } catch (err) {
      setError(err.response?.data?.error || 'Erro no upload do arquivo')
    } finally {
      setUploading(false)
    }
  }

  const handleDeletePeriod = async () => {
    if (!deletingPeriod) return

    setDeleting(true)
    try {
      await axios.delete(`/api/delete-period/${deletingPeriod.month}/${deletingPeriod.year}`)
      
      setShowDeleteDialog(false)
      setDeletingPeriod(null)
      
      // Recarregar dados
      loadPeriods()
      loadUploadBatches()
      loadSystemInfo()
      
      setUploadResult({
        success: true,
        message: `Dados do período ${deletingPeriod.month}/${deletingPeriod.year} deletados com sucesso`
      })

    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao deletar período')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteBatch = async (batchId) => {
    try {
      await axios.delete(`/api/delete-batch/${batchId}`)
      
      // Recarregar dados
      loadUploadBatches()
      loadPeriods()
      loadSystemInfo()
      
      setUploadResult({
        success: true,
        message: 'Lote de upload deletado com sucesso'
      })

    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao deletar lote de upload')
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configurações</h1>
        <p className="text-gray-600 dark:text-gray-400">Gestão de dados e configurações do sistema</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {uploadResult && (
        <Alert variant={uploadResult.success ? "default" : "destructive"}>
          {uploadResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription>
            {uploadResult.message}
            {uploadResult.processed_tickets && (
              <div className="mt-2">
                <strong>Resumo do processamento:</strong>
                <ul className="list-disc list-inside mt-1">
                  <li>{uploadResult.processed_tickets} tickets processados</li>
                  <li>{uploadResult.new_clients || 0} novos clientes criados</li>
                  <li>Período: {uploadResult.period}</li>
                </ul>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload">Upload de Dados</TabsTrigger>
          <TabsTrigger value="management">Gestão de Dados</TabsTrigger>
          <TabsTrigger value="batches">Histórico de Uploads</TabsTrigger>
          <TabsTrigger value="system">Sistema e Interface</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload de Arquivo Excel
              </CardTitle>
              <CardDescription>
                Faça upload do relatório Excel exportado do sistema de helpdesk para processar os dados de faturamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <Label htmlFor="file-input" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white">
                        Selecione um arquivo Excel
                      </span>
                    </Label>
                    <Input
                      id="file-input"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      className="mt-2"
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Arquivos suportados: .xlsx, .xls (máx. 50MB)
                  </p>
                </div>
              </div>

              {file && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Seleção de período */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="manual-period" 
                        checked={useManualPeriod}
                        onCheckedChange={setUseManualPeriod}
                      />
                      <Label htmlFor="manual-period">
                        Especificar período manualmente (caso contrário será detectado automaticamente)
                      </Label>
                    </div>

                    {useManualPeriod && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="month-select">Mês</Label>
                          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger id="month-select">
                              <SelectValue placeholder="Selecione o mês" />
                            </SelectTrigger>
                            <SelectContent>
                              {months.map((month) => (
                                <SelectItem key={month.value} value={month.value.toString()}>
                                  {month.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="year-select">Ano</Label>
                          <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger id="year-select">
                              <SelectValue placeholder="Selecione o ano" />
                            </SelectTrigger>
                            <SelectContent>
                              {years.map((year) => (
                                <SelectItem key={year} value={year.toString()}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="min-w-32"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Processar Arquivo
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                      Informações importantes sobre o upload:
                    </h4>
                    <ul className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                      <li>• O arquivo deve ser exportado diretamente do sistema de helpdesk</li>
                      <li>• Certifique-se de que todas as colunas obrigatórias estão presentes</li>
                      <li>• O sistema detecta automaticamente o período dos dados</li>
                      <li>• Clientes novos são criados automaticamente com configurações padrão</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="management" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Gestão de Períodos
              </CardTitle>
              <CardDescription>
                Visualize e remova dados de períodos específicos quando necessário
              </CardDescription>
            </CardHeader>
            <CardContent>
              {periods.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Período</TableHead>
                        <TableHead>Total de Tickets</TableHead>
                        <TableHead>Clientes</TableHead>
                        <TableHead>Última Atualização</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {periods.map((period) => (
                        <TableRow key={period.label}>
                          <TableCell className="font-medium">{period.label}</TableCell>
                          <TableCell>{period.total_tickets}</TableCell>
                          <TableCell>{period.total_clients}</TableCell>
                          <TableCell>{formatDate(period.last_update)}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setDeletingPeriod(period)
                                setShowDeleteDialog(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum período encontrado</h3>
                  <p className="text-muted-foreground">
                    Faça upload de um arquivo Excel para começar
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batches" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Uploads</CardTitle>
              <CardDescription>
                Rastreie todos os uploads realizados e remova lotes específicos se necessário
              </CardDescription>
            </CardHeader>
            <CardContent>
              {uploadBatches.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID do Lote</TableHead>
                        <TableHead>Nome do Arquivo</TableHead>
                        <TableHead>Tickets Processados</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Data do Upload</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploadBatches.map((batch) => (
                        <TableRow key={batch.batch_id}>
                          <TableCell className="font-mono text-sm">
                            {batch.batch_id.substring(0, 8)}...
                          </TableCell>
                          <TableCell>{batch.filename}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{batch.tickets_count}</Badge>
                          </TableCell>
                          <TableCell>{batch.period}</TableCell>
                          <TableCell>{formatDate(batch.upload_date)}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteBatch(batch.batch_id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum upload realizado</h3>
                  <p className="text-muted-foreground">
                    O histórico de uploads aparecerá aqui após o primeiro upload
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Sistema e Interface
              </CardTitle>
              <CardDescription>
                Informações do sistema, estatísticas gerais e configurações de interface
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Estatísticas do Sistema */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Estatísticas do Sistema</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Database className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total de Tickets</p>
                        <p className="text-2xl font-bold">{systemInfo.total_tickets || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Users className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total de Clientes</p>
                        <p className="text-2xl font-bold">{systemInfo.total_clients || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <HardDrive className="h-8 w-8 text-orange-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Tamanho do BD</p>
                        <p className="text-2xl font-bold">
                          {systemInfo.database_size ? formatFileSize(systemInfo.database_size) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Upload className="h-8 w-8 text-purple-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Uploads Realizados</p>
                        <p className="text-2xl font-bold">{systemInfo.total_uploads || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-yellow-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">PDFs Gerados</p>
                        <p className="text-2xl font-bold">{systemInfo.total_reports || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Settings className="h-8 w-8 text-gray-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Versão do Sistema</p>
                        <p className="text-2xl font-bold">v2.0</p>
                      </div>
                    </div>
                  </div>
                </div>

                {systemInfo.last_backup && (
                  <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-200">
                          Último backup realizado em: {formatDate(systemInfo.last_backup)}
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Dados protegidos e atualizados
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Configurações de Interface */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-semibold">Configurações de Interface</h3>
                
                {/* Tema */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {theme === 'light' ? (
                      <Sun className="h-6 w-6 text-yellow-500" />
                    ) : (
                      <Moon className="h-6 w-6 text-blue-500" />
                    )}
                    <div>
                      <p className="font-medium">
                        Tema {theme === 'light' ? 'Claro' : 'Escuro'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {theme === 'light' 
                          ? 'Interface clara com fundo branco' 
                          : 'Interface escura com fundo preto'
                        }
                      </p>
                    </div>
                  </div>
                  <Button onClick={toggleTheme} variant="outline">
                    {theme === 'light' ? (
                      <>
                        <Moon className="h-4 w-4 mr-2" />
                        Mudar para Escuro
                      </>
                    ) : (
                      <>
                        <Sun className="h-4 w-4 mr-2" />
                        Mudar para Claro
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Sobre o Sistema */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-semibold">Sobre o Sistema</h3>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
                  <div className="flex items-center gap-3">
                    <Info className="h-5 w-5 text-blue-600" />
                    <h4 className="font-medium">Sistema de Faturamento Helpdesk v2.0</h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Sistema desenvolvido para automatizar o processo de faturamento baseado em dados 
                    de tickets de helpdesk. Permite importação de relatórios Excel, cálculo automático 
                    de horas, geração de PDFs de faturamento e análise de performance.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg">
                      <p className="text-lg font-bold text-blue-600">React</p>
                      <p className="text-xs text-muted-foreground">Frontend</p>
                    </div>
                    <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg">
                      <p className="text-lg font-bold text-green-600">Flask</p>
                      <p className="text-xs text-muted-foreground">Backend</p>
                    </div>
                    <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg">
                      <p className="text-lg font-bold text-orange-600">SQLite</p>
                      <p className="text-xs text-muted-foreground">Database</p>
                    </div>
                    <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg">
                      <p className="text-lg font-bold text-purple-600">Python</p>
                      <p className="text-xs text-muted-foreground">Analytics</p>
                    </div>
                  </div>
                  <div className="text-center text-xs text-muted-foreground border-t pt-3 mt-4">
                    Última atualização: Outubro 2025
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. Todos os dados do período{' '}
              <strong>{deletingPeriod?.label}</strong> serão permanentemente removidos.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">
                  Dados que serão excluídos:
                </p>
                <ul className="mt-2 text-sm text-red-700 dark:text-red-300 space-y-1">
                  <li>• {deletingPeriod?.total_tickets} tickets processados</li>
                  <li>• Dados de {deletingPeriod?.total_clients} clientes</li>
                  <li>• Todos os relatórios PDF gerados</li>
                  <li>• Histórico de uploads do período</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeletePeriod}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Confirmar Exclusão
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default NewSettingsPage