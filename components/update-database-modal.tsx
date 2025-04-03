"use client"

import type React from "react"

import { useState } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Upload, Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/components/ui/use-toast"
import { IntegracaoItem } from "@/lib/integracao"

// Schema para validação do formulário
const formSchema = z.object({
  codigo: z.string().min(1, { message: "O código do produto é obrigatório" }),
  descricao: z.string().min(3, { message: "A descrição do produto é obrigatória" }),
  um: z.string().min(1, { message: "A unidade de medida é obrigatória" }),
  endereco: z.string().min(1, { message: "O endereço é obrigatório" }),
})

type FormValues = z.infer<typeof formSchema>

interface UpdateDatabaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void // Callback opcional para atualizar a UI após operações bem-sucedidas
}

export function UpdateDatabaseModal({ open, onOpenChange, onSuccess }: UpdateDatabaseModalProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("manual")
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      codigo: "",
      descricao: "",
      um: "",
      endereco: "",
    },
  })

  // Função para inserir um único item manualmente
  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true)

      const novoItem: IntegracaoItem = {
        codigo: values.codigo,
        descricao: values.descricao,
        um: values.um,
        endereco: values.endereco,
      }

      // Chamada para a API
      const response = await fetch('/api/insert_upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(novoItem),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Erro ao adicionar item')
      }

      toast({
        title: "Item adicionado",
        description: "O item foi adicionado com sucesso à base de dados",
      })

      form.reset()
      
      // Chamar callback de sucesso se fornecido
      if (onSuccess) {
        onSuccess()
      }
      
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar item",
        description: error.message || "Ocorreu um erro ao tentar adicionar o item",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Manipulador para seleção de arquivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  // Função para upload de arquivo
  const handleFileUpload = async () => {
    if (!file) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione um arquivo para upload",
        variant: "destructive",
      })
      return
    }

    // Verifica se é um arquivo Excel
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo Excel (.xlsx ou .xls)",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    setUploadProgress(10)

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Simular progresso (em uma aplicação real você poderia usar XMLHttpRequest para monitorar o progresso)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 10
          if (newProgress >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return newProgress
        })
      }, 300)

      // Chamar a API
      const response = await fetch('/api/insert_upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Erro no upload do arquivo')
      }

      toast({
        title: "Upload concluído",
        description: result.message || `${result.count} items foram importados com sucesso`,
      })

      setFile(null)
      onOpenChange(false)
      
      // Chamar callback de sucesso se fornecido
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message || "Ocorreu um erro ao processar o arquivo",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      setUploadProgress(0)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // Resetar o estado quando o modal for fechado
      if (!newOpen) {
        setFile(null)
        setUploadProgress(0)
        form.reset()
      }
      onOpenChange(newOpen)
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Atualizar Base de Dados</DialogTitle>
          <DialogDescription>Adicione novos itens manualmente ou via planilha Excel.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="manual" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="upload">Upload de Planilha</TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="codigo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: P001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Input placeholder="Descrição do item" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="um"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade de Medida</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: UN, KG, CX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endereco"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Input placeholder="Local de estoque" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                      Processando...
                    </div>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Item
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="upload">
            <div className="space-y-4 py-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <label htmlFor="file-upload" className="text-sm font-medium">
                  Arquivo Excel
                </label>
                <Input 
                  id="file-upload" 
                  type="file" 
                  accept=".xlsx,.xls" 
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">Formatos aceitos: .xlsx, .xls</p>
              </div>

              {file && (
                <div className="text-sm">
                  Arquivo selecionado: <span className="font-medium">{file.name}</span>
                </div>
              )}

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}

              <Button 
                onClick={handleFileUpload} 
                className="w-full" 
                disabled={!file || isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                    Processando...
                  </div>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Enviar Arquivo
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}