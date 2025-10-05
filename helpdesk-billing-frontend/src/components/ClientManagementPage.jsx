import { useState, useEffect } from 'react'
import axios from 'axios'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Switch } from '@/components/ui/switch.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Plus, Edit2, Search, Trash2, Save, X, Settings, Database, AlertTriangle, Info, Upload } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'

const ClientManagementPage = () => {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  
  // Administração
  const [periods, setPeriods] = useState([])
  const [systemInfo, setSystemInfo] = useState(null)
  const [adminLoading, setAdminLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('clients')
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [uploadBatches, setUploadBatches] = useState([])
  
  // Formulário
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    sector: '',
    email: '',
    phone: '',
    whatsapp_contact: '',
    address: '',
    contract_hours: 10.0,
    hourly_rate: 100.0,
    overtime_rate: 115.0,
    external_service_rate: 88.0,
    notes: '',
    active: true
  })

  // Carregar clientes
  const loadClients = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/clients')
      setClients(response.data.clients || [])
    } catch (err) {
      setError('Erro ao carregar clientes')
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClients()
  }, [])

  // Funções da administração
  const loadPeriods = async () => {
    try {
      const response = await axios.get('/api/admin/processed-periods')
      setPeriods(response.data.periods || [])
    } catch (err) {
      setError('Erro ao carregar períodos')
      console.error('Erro:', err)
    }
  }

  const loadSystemInfo = async () => {
    try {
      const response = await axios.get('/api/admin/system-info')
      setSystemInfo(response.data.system_info || {})
    } catch (err) {
      console.error('Erro ao carregar info do sistema:', err)
    }
  }

  const deletePeriod = async (month, year) => {
    if (!confirm(`Tem certeza que deseja deletar todos os dados do período ${month.toString().padStart(2, '0')}/${year}? Esta ação não pode ser desfeita.`)) {
      return
    }

    setAdminLoading(true)
    try {
      await axios.delete(`/api/admin/delete-period/${month}/${year}`)
      setSuccess(`Período ${month.toString().padStart(2, '0')}/${year} deletado com sucesso`)
      loadPeriods() // Recarregar lista
    } catch (err) {
      setError('Erro ao deletar período')
      console.error('Erro:', err)
    } finally {
      setAdminLoading(false)
    }
  }

  const createBackup = async () => {
    setAdminLoading(true)
    try {
      await axios.post('/api/admin/backup-database')
      setSuccess('Backup criado com sucesso')
    } catch (err) {
      setError('Erro ao criar backup')
      console.error('Erro:', err)
    } finally {
      setAdminLoading(false)
    }
  }

  const loadUploadBatches = async (month, year) => {
    try {
      const response = await axios.get(`/api/admin/upload-batches/${month}/${year}`)
      setUploadBatches(response.data.batches || [])
    } catch (err) {
      console.error('Erro ao carregar lotes de upload:', err)
      setUploadBatches([])
    }
  }

  const deleteBatch = async (batchId) => {
    if (!confirm(`Tem certeza que deseja deletar o lote ${batchId}? Esta ação não pode ser desfeita.`)) {
      return
    }

    setAdminLoading(true)
    try {
      await axios.delete(`/api/admin/delete-batch/${batchId}`)
      setSuccess(`Lote ${batchId} deletado com sucesso`)
      
      // Recarregar dados
      loadPeriods()
      if (selectedPeriod) {
        const [month, year] = selectedPeriod.split('/')
        loadUploadBatches(parseInt(month), parseInt(year))
      }
    } catch (err) {
      setError('Erro ao deletar lote')
      console.error('Erro:', err)
    } finally {
      setAdminLoading(false)
    }
  }

  // Carregar dados admin quando mudar para tab admin
  useEffect(() => {
    if (activeTab === 'admin') {
      loadPeriods()
      loadSystemInfo()
    }
  }, [activeTab])

  // Carregar lotes quando período for selecionado
  useEffect(() => {
    if (selectedPeriod && activeTab === 'admin') {
      const [month, year] = selectedPeriod.split('/')
      loadUploadBatches(parseInt(month), parseInt(year))
    }
  }, [selectedPeriod, activeTab])

  // Filtrar clientes
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.sector?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Reset formulário
  const resetForm = () => {
    setFormData({
      name: '',
      contact: '',
      sector: '',
      email: '',
      phone: '',
      whatsapp_contact: '',
      address: '',
      contract_hours: 10.0,
      hourly_rate: 100.0,
      overtime_rate: 115.0,
      external_service_rate: 88.0,
      notes: '',
      active: true
    })
    setEditingClient(null)
    setError('')
    setSuccess('')
  }

  // Abrir modal para edição
  const openEditDialog = (client) => {
    setFormData({
      name: client.name || '',
      contact: client.contact || '',
      sector: client.sector || '',
      email: client.email || '',
      phone: client.phone || '',
      whatsapp_contact: client.whatsapp_contact || '',
      address: client.address || '',
      contract_hours: client.contract_hours || 10.0,
      hourly_rate: client.hourly_rate || 100.0,
      overtime_rate: client.overtime_rate || 115.0,
      external_service_rate: client.external_service_rate || 88.0,
      notes: client.notes || '',
      active: client.active !== false
    })
    setEditingClient(client)
    setIsDialogOpen(true)
  }

  // Abrir modal para novo cliente
  const openNewDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  // Salvar cliente
  const saveClient = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (editingClient) {
        // Atualizar
        await axios.put(`/api/clients/${editingClient.id}`, formData)
        setSuccess('Cliente atualizado com sucesso!')
      } else {
        // Criar
        await axios.post('/api/clients', formData)
        setSuccess('Cliente criado com sucesso!')
      }
      
      await loadClients()
      setIsDialogOpen(false)
      resetForm()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar cliente')
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  // Desativar cliente
  const deactivateClient = async (clientId) => {
    if (!confirm('Tem certeza que deseja desativar este cliente?')) return

    try {
      await axios.delete(`/api/clients/${clientId}`)
      setSuccess('Cliente desativado com sucesso!')
      loadClients()
    } catch (err) {
      setError('Erro ao desativar cliente')
      console.error('Erro:', err)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações e Administração
          </CardTitle>
          <CardDescription>
            Gerencie clientes, configurações e dados do sistema
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Edit2 className="h-4 w-4" />
            Gestão de Clientes
          </TabsTrigger>
          <TabsTrigger value="admin" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Administração
          </TabsTrigger>
        </TabsList>

        {/* Cliente Management Tab */}
        <TabsContent value="clients" className="space-y-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Gestão de Clientes</h2>
                <p className="text-muted-foreground">
                  Configure as regras de faturamento para cada cliente
                </p>
              </div>
              <Button onClick={openNewDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Cliente
              </Button>
            </div>

            {/* Alertas */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* Busca */}
            <Card>
              <CardHeader>
                <CardTitle>Filtrar Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou setor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Clientes */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes Cadastrados ({filteredClients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Horas Contratuais</TableHead>
                  <TableHead>Valor/Hora</TableHead>
                  <TableHead>Valor Excedente</TableHead>
                  <TableHead>Valor Externo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.sector || '-'}</TableCell>
                    <TableCell>{client.contract_hours}h</TableCell>
                    <TableCell>R$ {client.hourly_rate}</TableCell>
                    <TableCell>R$ {client.overtime_rate}</TableCell>
                    <TableCell>R$ {client.external_service_rate}</TableCell>
                    <TableCell>
                      <Badge variant={client.active ? 'default' : 'secondary'}>
                        {client.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(client)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {client.active && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deactivateClient(client.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para Criar/Editar Cliente */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
            </DialogTitle>
            <DialogDescription>
              Configure as informações e regras de faturamento do cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Informações Básicas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Nome do cliente"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sector">Setor</Label>
                <Input
                  id="sector"
                  value={formData.sector}
                  onChange={(e) => setFormData({...formData, sector: e.target.value})}
                  placeholder="Setor/Departamento"
                />
              </div>
            </div>

            {/* Contato */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact">Contato</Label>
                <Input
                  id="contact"
                  value={formData.contact}
                  onChange={(e) => setFormData({...formData, contact: e.target.value})}
                  placeholder="Nome do contato"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="email@cliente.com"
                />
              </div>
            </div>

            {/* Informações WhatsApp */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone/WhatsApp</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp_contact">Responsável WhatsApp</Label>
                <Input
                  id="whatsapp_contact"
                  value={formData.whatsapp_contact}
                  onChange={(e) => setFormData({...formData, whatsapp_contact: e.target.value})}
                  placeholder="Nome do responsável para receber relatórios"
                />
              </div>
            </div>

            {/* Regras de Faturamento */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Regras de Faturamento</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contract_hours">Horas Contratuais/Mês</Label>
                  <Input
                    id="contract_hours"
                    type="number"
                    step="0.5"
                    value={formData.contract_hours}
                    onChange={(e) => setFormData({...formData, contract_hours: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hourly_rate">Valor da Hora (R$)</Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    step="0.01"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({...formData, hourly_rate: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="overtime_rate">Valor Hora Excedente (R$)</Label>
                  <Input
                    id="overtime_rate"
                    type="number"
                    step="0.01"
                    value={formData.overtime_rate}
                    onChange={(e) => setFormData({...formData, overtime_rate: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="external_service_rate">Valor Atendimento Externo (R$)</Label>
                  <Input
                    id="external_service_rate"
                    type="number"
                    step="0.01"
                    value={formData.external_service_rate}
                    onChange={(e) => setFormData({...formData, external_service_rate: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Observações especiais sobre o cliente..."
                rows={3}
              />
            </div>

            {/* Status */}
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({...formData, active: checked})}
              />
              <Label htmlFor="active">Cliente Ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={saveClient} disabled={loading || !formData.name}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
            </div>
        </TabsContent>

        {/* Administration Tab */}
        <TabsContent value="admin" className="space-y-6">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Administração do Sistema</h2>
              <p className="text-muted-foreground">
                Gerencie dados processados, faça backups e monitore o sistema
              </p>
            </div>

            {/* Alertas */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* System Info */}
            {systemInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Informações do Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Tamanho do Banco</p>
                      <p className="text-lg font-semibold">{systemInfo.database_size_mb} MB</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Versão do Schema</p>
                      <p className="text-lg font-semibold">v{systemInfo.database_version}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ambiente</p>
                      <p className="text-lg font-semibold">{systemInfo.environment}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Debug Mode</p>
                      <Badge variant={systemInfo.flask_debug ? "destructive" : "secondary"}>
                        {systemInfo.flask_debug ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Ações do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button onClick={createBackup} disabled={adminLoading}>
                    <Database className="h-4 w-4 mr-2" />
                    {adminLoading ? 'Criando...' : 'Criar Backup'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Upload Batch Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Gestão de Uploads
                </CardTitle>
                <CardDescription>
                  Gerencie uploads específicos de cada período
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium">Período:</label>
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Selecione um período" />
                      </SelectTrigger>
                      <SelectContent>
                        {periods.map((period) => (
                          <SelectItem key={`${period.year}-${period.month}`} value={period.period_label}>
                            {period.period_label} ({period.record_count} registros)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedPeriod && uploadBatches.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lote ID</TableHead>
                          <TableHead>Registros</TableHead>
                          <TableHead>Data Upload</TableHead>
                          <TableHead>Clientes</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {uploadBatches.map((batch) => (
                          <TableRow key={batch.batch_id}>
                            <TableCell className="font-mono text-sm">
                              {batch.batch_id}
                            </TableCell>
                            <TableCell>{batch.record_count}</TableCell>
                            <TableCell>
                              {batch.upload_time ? new Date(batch.upload_time).toLocaleString('pt-BR') : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs">
                                <Badge variant="outline" className="mr-1">
                                  {batch.clients.length} clientes
                                </Badge>
                                {batch.clients.slice(0, 2).map((client, idx) => (
                                  <span key={idx} className="text-xs text-muted-foreground block">
                                    {client}
                                  </span>
                                ))}
                                {batch.clients.length > 2 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{batch.clients.length - 2} outros
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteBatch(batch.batch_id)}
                                disabled={adminLoading}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Deletar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}

                  {selectedPeriod && uploadBatches.length === 0 && (
                    <p className="text-muted-foreground">Nenhum lote de upload encontrado para este período</p>
                  )}

                  {!selectedPeriod && (
                    <p className="text-muted-foreground">Selecione um período para ver os uploads</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Period Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  Gestão de Períodos
                </CardTitle>
                <CardDescription>
                  Delete dados de períodos específicos. Esta ação não pode ser desfeita.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {periods.length === 0 ? (
                  <p className="text-muted-foreground">Nenhum período processado encontrado</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Período</TableHead>
                        <TableHead>Registros</TableHead>
                        <TableHead>Primeiro Upload</TableHead>
                        <TableHead>Último Upload</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {periods.map((period) => (
                        <TableRow key={`${period.year}-${period.month}`}>
                          <TableCell className="font-medium">
                            {period.period_label}
                          </TableCell>
                          <TableCell>{period.record_count}</TableCell>
                          <TableCell>
                            {period.first_upload ? new Date(period.first_upload).toLocaleString('pt-BR') : '-'}
                          </TableCell>
                          <TableCell>
                            {period.last_upload ? new Date(period.last_upload).toLocaleString('pt-BR') : '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deletePeriod(period.month, period.year)}
                              disabled={adminLoading}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Deletar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ClientManagementPage