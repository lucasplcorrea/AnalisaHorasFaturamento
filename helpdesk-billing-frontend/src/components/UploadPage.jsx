import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

const UploadPage = () => {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())

  const onDrop = useCallback((acceptedFiles) => {
    const selectedFile = acceptedFiles[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
      setResult(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  })

  const handleUpload = async () => {
    if (!file) {
      setError('Por favor, selecione um arquivo')
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('month', month.toString())
    formData.append('year', year.toString())

    try {
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(progress)
        }
      })

      if (response.data.success) {
        setResult(response.data)
        setFile(null)
      } else {
        setError(response.data.message || 'Erro ao processar arquivo')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer upload do arquivo')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload de Dados do Helpdesk
          </CardTitle>
          <CardDescription>
            Faça upload do arquivo Excel (.xlsx ou .xls) exportado do seu sistema de helpdesk
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Período de Referência */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Mês de Referência</Label>
              <Input
                id="month"
                type="number"
                min="1"
                max="12"
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                placeholder="Mês (1-12)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Ano de Referência</Label>
              <Input
                id="year"
                type="number"
                min="2020"
                max="2030"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                placeholder="Ano"
              />
            </div>
          </div>

          {/* Área de Drop */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <div className="space-y-4">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-gray-400" />
              {isDragActive ? (
                <p className="text-blue-600">Solte o arquivo aqui...</p>
              ) : (
                <div>
                  <p className="text-gray-600 mb-2">
                    Arraste e solte seu arquivo Excel aqui, ou clique para selecionar
                  </p>
                  <p className="text-sm text-gray-500">
                    Formatos aceitos: .xlsx, .xls (máximo 10MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Arquivo Selecionado */}
          {file && (
            <Card className="bg-gray-50">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-gray-500">{formatBytes(file.size)}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setFile(null)}
                    variant="outline"
                    size="sm"
                  >
                    Remover
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress Bar */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processando arquivo...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {/* Botão de Upload */}
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full"
            size="lg"
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
        </CardContent>
      </Card>

      {/* Resultado do Upload */}
      {result && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              Processamento Concluído
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="font-medium text-green-800">Período</p>
                  <p className="text-green-700">{String(result.month).padStart(2, '0')}/{result.year}</p>
              </div>
              <div>
                <p className="font-medium text-green-800">Registros</p>
                <p className="text-green-700">{result.processed_records}</p>
              </div>
              <div>
                <p className="font-medium text-green-800">Clientes</p>
                <p className="text-green-700">{result.statistics?.unique_clients || 0}</p>
              </div>
              <div>
                <p className="font-medium text-green-800">Total de Horas</p>
                <p className="text-green-700">{result.statistics?.total_hours?.toFixed(2) || 0}h</p>
              </div>
            </div>
            <Alert className="mt-4 border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                {result.message}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Erro */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Instruções */}
      <Card>
        <CardHeader>
          <CardTitle>Instruções</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <p>
            <strong>1.</strong> Exporte os dados do seu sistema de helpdesk em formato Excel (.xlsx ou .xls)
          </p>
          <p>
            <strong>2.</strong> Certifique-se de que o arquivo contém as seguintes colunas:
          </p>
          <div className="ml-4 grid grid-cols-2 gap-1 text-xs">
            <span>• Ticket</span>
            <span>• Cliente</span>
            <span>• Assunto</span>
            <span>• Técnico</span>
            <span>• Categoria primária</span>
            <span>• Categoria secundária</span>
            <span>• Data de finalização</span>
            <span>• Tempo total de atendimento</span>
            <span>• Atendimento externo?</span>
            <span>• E outras colunas conforme necessário</span>
          </div>
          <p>
            <strong>3.</strong> Selecione o mês e ano de referência antes de fazer o upload
          </p>
          <p>
            <strong>4.</strong> Após o processamento, você poderá visualizar os dados no Dashboard e gerar relatórios
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default UploadPage
