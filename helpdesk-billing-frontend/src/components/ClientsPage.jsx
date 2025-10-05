import { useState, useEffect } from 'react'
import axios from 'axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx'
import { Users, Edit, Save, X, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

const ClientsPage = () => {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [editingClient, setEditingClient] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadClients()
  }, [])

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

  const handleEdit = (client) => {
    setEditingClient(client.id)
    setEditForm({
      name: client.name,
      contact: client.contact || '',
      sector: client.sector || '',
      contract_hours: client.contract_hours,
      hourly_rate: client.hourly_rate,
      overtime_rate: client.overtime_rate,
      external_service_rate: client.external_service_rate
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    
    try {
      const response = await axios.put(`/api/clients/${editingClient}`, editForm)
      
      // Atualizar a lista de clientes
      setClients(clients.map(client => 
        client.id === editingClient ? response.data.client : client
      ))
      
      setEditingClient(null)
      setEditForm({})
      setSuccess('Cliente atualizado com sucesso!')
      
      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar cliente')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditingClient(null)
    setEditForm({})
    setError(null)
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gerenciamento de Clientes
          </CardTitle>
          <CardDescription>
            Gerencie os contratos e configurações de cobrança dos seus clientes
          </CardDescription>
        </CardHeader>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {clients.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum cliente encontrado</h3>
            <p className="text-muted-foreground">
              Os clientes serão automaticamente cadastrados quando você fizer upload dos dados do helpdesk
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Lista de Clientes ({clients.length})</CardTitle>
            <CardDescription>
              Clique no botão "Editar" para modificar as configurações de contrato de um cliente
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
                    <TableHead>Valor Excedente</TableHead>
                    <TableHead>Valor Externo</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        {editingClient === client.id ? (
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                            className="w-full"
                          />
                        ) : (
                          <div>
                            <div className="font-medium">{client.name}</div>
                            <div className="text-sm text-muted-foreground">
                              ID: {client.id}
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingClient === client.id ? (
                          <Input
                            value={editForm.contact}
                            onChange={(e) => setEditForm({...editForm, contact: e.target.value})}
                            placeholder="Contato"
                          />
                        ) : (
                          client.contact || '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {editingClient === client.id ? (
                          <Input
                            value={editForm.sector}
                            onChange={(e) => setEditForm({...editForm, sector: e.target.value})}
                            placeholder="Setor"
                          />
                        ) : (
                          client.sector || '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {editingClient === client.id ? (
                          <Input
                            type="number"
                            step="0.5"
                            value={editForm.contract_hours}
                            onChange={(e) => setEditForm({...editForm, contract_hours: parseFloat(e.target.value)})}
                          />
                        ) : (
                          `${client.contract_hours}h`
                        )}
                      </TableCell>
                      <TableCell>
                        {editingClient === client.id ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editForm.hourly_rate}
                            onChange={(e) => setEditForm({...editForm, hourly_rate: parseFloat(e.target.value)})}
                          />
                        ) : (
                          formatCurrency(client.hourly_rate)
                        )}
                      </TableCell>
                      <TableCell>
                        {editingClient === client.id ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editForm.overtime_rate}
                            onChange={(e) => setEditForm({...editForm, overtime_rate: parseFloat(e.target.value)})}
                          />
                        ) : (
                          formatCurrency(client.overtime_rate)
                        )}
                      </TableCell>
                      <TableCell>
                        {editingClient === client.id ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editForm.external_service_rate}
                            onChange={(e) => setEditForm({...editForm, external_service_rate: parseFloat(e.target.value)})}
                          />
                        ) : (
                          formatCurrency(client.external_service_rate)
                        )}
                      </TableCell>
                      <TableCell>
                        {editingClient === client.id ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={handleSave}
                              disabled={saving}
                            >
                              {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancel}
                              disabled={saving}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(client)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações sobre Configurações Padrão */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações Padrão</CardTitle>
          <CardDescription>
            Novos clientes são criados automaticamente com estas configurações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">Horas Contratuais</p>
              <p className="text-lg font-semibold">10h</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Valor por Hora</p>
              <p className="text-lg font-semibold">R$ 100,00</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Hora Excedente</p>
              <p className="text-lg font-semibold">R$ 115,00</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Atendimento Externo</p>
              <p className="text-lg font-semibold">R$ 88,00</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ClientsPage
