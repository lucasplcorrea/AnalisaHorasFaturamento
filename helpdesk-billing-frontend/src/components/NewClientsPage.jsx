import { useState, useEffect } from 'react'
import axios from 'axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Users, Edit, Save, X, Loader2, AlertCircle, CheckCircle, Plus, TrendingUp, Clock, DollarSign, BarChart3 } from 'lucide-react'
import { formatHoursToHoursMinutes, formatCurrency, formatDate } from '@/lib/formatters.js'

const NewClientsPage = () => {
  const [clients, setClients] = useState([])
  const [periods, setPeriods] = useState([])
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [clientMetrics, setClientMetrics] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [editingClient, setEditingClient] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)

  const newClientForm = {
    name: '',
    contact: '',
    sector: '',
    email: '',
    phone: '',
    whatsapp_contact: '',
    address: '',
    contract_hours: 10,
    hourly_rate: 100,
    overtime_rate: 115,
    external_service_rate: 88,
    notes: ''
  }

  useEffect(() => {
    loadClients()
    loadPeriods()
  }, [])

  useEffect(() => {
    if (selectedPeriod) {
      const [month, year] = selectedPeriod.split('/')
      loadClientMetrics(parseInt(month), parseInt(year))
    }
  }, [selectedPeriod])

  const loadClients = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get('/api/clients')
      setClients(response.data.clients || [])
    } catch (err) {
      setError('Erro ao carregar clientes')
    } finally {
      setLoading(false)
    }
  }

  const loadPeriods = async () => {
    try {
      const response = await axios.get('/api/periods')
      setPeriods(response.data)
      if (response.data.length > 0) {
        setSelectedPeriod(response.data[0].label)
      }
    } catch (err) {
      console.error('Erro ao carregar períodos:', err)
    }
  }

  const loadClientMetrics = async (month, year) => {
    try {
      const response = await axios.get(`/api/billing/${month}/${year}`)
      const metrics = {}
      
      if (response.data.clients) {
        response.data.clients.forEach(client => {
          metrics[client.client_name] = {
            tickets: client.tickets?.length || 0,
            total_hours: client.total_hours || 0,
            total_value: client.total_value || 0,
            overtime_hours: client.overtime_hours || 0,
            external_services: client.external_services || 0
          }
        })
      }
      
      setClientMetrics(metrics)
    } catch (err) {
      console.error('Erro ao carregar métricas dos clientes:', err)
    }
  }

  const handleEdit = (client) => {
    setEditingClient(client.id)
    setEditForm({
      name: client.name,
      contact: client.contact || '',
      sector: client.sector || '',
      email: client.email || '',
      phone: client.phone || '',
      whatsapp_contact: client.whatsapp_contact || '',
      address: client.address || '',
      contract_hours: client.contract_hours,
      hourly_rate: client.hourly_rate,
      overtime_rate: client.overtime_rate,
      external_service_rate: client.external_service_rate,
      notes: client.notes || ''
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    
    try {
      const response = await axios.put(`/api/clients/${editingClient}`, editForm)
      
      setClients(clients.map(client => 
        client.id === editingClient ? response.data.client : client
      ))
      
      setEditingClient(null)
      setEditForm({})
      setSuccess('Cliente atualizado com sucesso!')
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar cliente')
    } finally {
      setSaving(false)
    }
  }

  const handleAdd = async () => {
    setSaving(true)
    setError(null)
    
    try {
      await axios.post('/api/clients', editForm)
      await loadClients()
      setShowAddDialog(false)
      setEditForm(newClientForm)
      setSuccess('Cliente criado com sucesso!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar cliente')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditingClient(null)
    setEditForm({})
  }

  const getClientMetrics = (clientName) => {
    return clientMetrics[clientName] || {
      tickets: 0,
      total_hours: 0,
      total_value: 0,
      overtime_hours: 0,
      external_services: 0
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando clientes...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Clientes</h1>
          <p className="text-gray-600 dark:text-gray-400">Gestão de clientes e análise de performance</p>
        </div>
        <div className="flex items-center gap-4">
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
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditForm(newClientForm)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Cliente</DialogTitle>
                <DialogDescription>
                  Preencha as informações do novo cliente
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    placeholder="Nome do cliente"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contact">Contato</Label>
                  <Input
                    id="contact"
                    value={editForm.contact}
                    onChange={(e) => setEditForm({...editForm, contact: e.target.value})}
                    placeholder="Nome do contato"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    placeholder="email@exemplo.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={editForm.whatsapp_contact}
                    onChange={(e) => setEditForm({...editForm, whatsapp_contact: e.target.value})}
                    placeholder="Nome para WhatsApp"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sector">Setor</Label>
                  <Input
                    id="sector"
                    value={editForm.sector}
                    onChange={(e) => setEditForm({...editForm, sector: e.target.value})}
                    placeholder="Setor da empresa"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contract_hours">Horas Contratuais</Label>
                  <Input
                    id="contract_hours"
                    type="number"
                    value={editForm.contract_hours}
                    onChange={(e) => setEditForm({...editForm, contract_hours: parseFloat(e.target.value)})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="hourly_rate">Valor Hora (R$)</Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    value={editForm.hourly_rate}
                    onChange={(e) => setEditForm({...editForm, hourly_rate: parseFloat(e.target.value)})}
                  />
                </div>
                
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={editForm.address}
                    onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                    placeholder="Endereço completo"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAdd} disabled={saving || !editForm.name}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Criar Cliente
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="management" className="space-y-6">
        <TabsList>
          <TabsTrigger value="management">Gestão de Clientes</TabsTrigger>
          <TabsTrigger value="analytics">Analytics por Cliente</TabsTrigger>
        </TabsList>

        <TabsContent value="management" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Clientes</CardTitle>
              <CardDescription>
                Gerencie as informações e configurações dos seus clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Setor</TableHead>
                      <TableHead>Horas Contratuais</TableHead>
                      <TableHead>Valor/Hora</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{client.name}</div>
                            {client.email && (
                              <div className="text-sm text-muted-foreground">{client.email}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            {client.contact && <div>{client.contact}</div>}
                            {client.phone && (
                              <div className="text-sm text-muted-foreground">{client.phone}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{client.sector || '-'}</TableCell>
                        <TableCell>{formatHoursToHoursMinutes(client.contract_hours)}</TableCell>
                        <TableCell>{formatCurrency(client.hourly_rate)}</TableCell>
                        <TableCell>
                          <Badge variant={client.active ? "default" : "secondary"}>
                            {client.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEdit(client)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedClient(client)}
                            >
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Top Clientes por Faturamento */}
          {Object.keys(clientMetrics).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Performance dos Clientes - {selectedPeriod}</CardTitle>
                <CardDescription>
                  Métricas de performance dos clientes no período selecionado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(clientMetrics)
                    .sort(([,a], [,b]) => b.total_value - a.total_value)
                    .map(([clientName, metrics], index) => (
                      <Card key={clientName} className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{clientName}</CardTitle>
                            <Badge variant={index < 3 ? "default" : "secondary"}>
                              #{index + 1}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <BarChart3 className="h-4 w-4 text-blue-600" />
                              <span>{metrics.tickets} chamados</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-green-600" />
                              <span>{formatHoursToHoursMinutes(metrics.total_hours)}</span>
                            </div>
                          </div>
                          
                          <div className="pt-2 border-t">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Faturamento:</span>
                              <span className="font-semibold text-green-600">
                                {formatCurrency(metrics.total_value)}
                              </span>
                            </div>
                          </div>
                          
                          {metrics.overtime_hours > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Horas extras:</span>
                              <Badge variant="outline">
                                {formatHoursToHoursMinutes(metrics.overtime_hours)}
                              </Badge>
                            </div>
                          )}
                          
                          {metrics.external_services > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Atend. externos:</span>
                              <Badge variant="outline">
                                {metrics.external_services}
                              </Badge>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      {editingClient && (
        <Dialog open={!!editingClient} onOpenChange={() => setEditingClient(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Cliente</DialogTitle>
              <DialogDescription>
                Atualize as informações do cliente
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome *</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-contact">Contato</Label>
                <Input
                  id="edit-contact"
                  value={editForm.contact}
                  onChange={(e) => setEditForm({...editForm, contact: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Telefone</Label>
                <Input
                  id="edit-phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-contract-hours">Horas Contratuais</Label>
                <Input
                  id="edit-contract-hours"
                  type="number"
                  value={editForm.contract_hours}
                  onChange={(e) => setEditForm({...editForm, contract_hours: parseFloat(e.target.value)})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-hourly-rate">Valor Hora (R$)</Label>
                <Input
                  id="edit-hourly-rate"
                  type="number"
                  value={editForm.hourly_rate}
                  onChange={(e) => setEditForm({...editForm, hourly_rate: parseFloat(e.target.value)})}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default NewClientsPage