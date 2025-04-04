"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { X, Plus, Check, Loader2, Mail, Download } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Alert, 
  AlertDescription, 
  AlertTitle 
} from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { 
  Produto, 
  ItemPedido, 
  Pedido, 
  ApiProdutoResponse 
} from "@/lib/pedidos"

const formSchema = z.object({
  solicitante: z.string().min(3, { message: "O nome do solicitante é obrigatório" }),
  codigoProduto: z.string().optional(),
  quantidade: z.coerce.number().positive().optional(),
  observacoes: z.string().optional(),
  emailDestinatario: z.string().email("Digite um e-mail válido").optional(),
})

type FormValues = z.infer<typeof formSchema>

interface NewOrderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void // Callback opcional para atualizar a UI após pedido criado
}

export function NewOrderModal({ open, onOpenChange, onSuccess }: NewOrderModalProps) {
  const { toast } = useToast()
  const [dataAtual, setDataAtual] = useState("")
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [itensPedido, setItensPedido] = useState<ItemPedido[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [pedidoCriado, setPedidoCriado] = useState<{id: string, codigo: string} | null>(null)
  const [showEmailForm, setShowEmailForm] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      solicitante: "",
      codigoProduto: "",
      quantidade: undefined,
      observacoes: "",
      emailDestinatario: "",
    },
  })

  useEffect(() => {
    // Atualiza a data atual no formato brasileiro
    const now = new Date()
    setDataAtual(format(now, "dd/MM/yyyy HH:mm:ss", { locale: ptBR }))
  }, [])

  const handleCodigoKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      const codigo = form.getValues("codigoProduto")
      if (codigo) {
        buscarProduto(codigo)
      }
    }
  }

  const buscarProduto = async (codigo: string) => {
    setIsSearching(true)
    try {
      const response = await fetch(`/api/produtos?codigo=${encodeURIComponent(codigo)}`)
      const result: ApiProdutoResponse = await response.json()
      
      if (!result.success || !result.data) {
        toast({
          title: "Produto não encontrado",
          description: result.message || `Não foi possível encontrar o produto com código ${codigo}`,
          variant: "destructive",
        })
        setProdutoSelecionado(null)
        return
      }
      
      setProdutoSelecionado(result.data)
      
      // Foca no campo de quantidade
      setTimeout(() => {
        const quantidadeInput = document.getElementById("quantidade")
        if (quantidadeInput) {
          quantidadeInput.focus()
        }
      }, 100)
    } catch (error) {
      console.error("Erro ao buscar produto:", error)
      toast({
        title: "Erro ao buscar produto",
        description: "Ocorreu um erro ao tentar buscar o produto. Tente novamente.",
        variant: "destructive",
      })
      setProdutoSelecionado(null)
    } finally {
      setIsSearching(false)
    }
  }

  const adicionarItem = () => {
    const codigo = form.getValues("codigoProduto");
    const quantidade = form.getValues("quantidade");
    
    // Validação amigável com mensagens específicas
    if (!codigo) {
      toast({
        title: "Código do produto não informado",
        description: "Digite o código do produto e pressione Enter para buscar",
        variant: "destructive",
      });
      return;
    }
    
    if (!produtoSelecionado) {
      toast({
        title: "Produto não encontrado",
        description: "Busque um produto válido antes de adicionar ao pedido",
        variant: "destructive",
      });
      return;
    }
    
    if (!quantidade) {
      toast({
        title: "Quantidade não informada",
        description: "Informe a quantidade desejada para este item",
        variant: "destructive",
      });
      return;
    }

    const novoItem: ItemPedido = {
      codigo: produtoSelecionado.codigo,
      descricao: produtoSelecionado.descricao,
      unidadeMedida: produtoSelecionado.unidadeMedida,
      endereco: produtoSelecionado.endereco,
      quantidade: quantidade,
    }

    setItensPedido([...itensPedido, novoItem])
    
    // Limpa os campos de produto e quantidade
    form.setValue("codigoProduto", "")
    form.setValue("quantidade", undefined)
    setProdutoSelecionado(null)
    
    form.clearErrors("codigoProduto")
    form.clearErrors("quantidade")
    
    // Foca no campo de código novamente
    setTimeout(() => {
      const codigoInput = document.getElementById("codigoProduto")
      if (codigoInput) {
        codigoInput.focus()
      }
    }, 100)
  }

  const removerItem = (index: number) => {
    const novosItens = [...itensPedido]
    novosItens.splice(index, 1)
    setItensPedido(novosItens)
  }

  const finalizarPedido = async () => {
    const solicitante = form.getValues("solicitante")
    const observacoes = form.getValues("observacoes")
    
    if (!solicitante) {
      toast({
        title: "Dados incompletos",
        description: "Informe o nome do solicitante",
        variant: "destructive",
      })
      return
    }
    
    if (itensPedido.length === 0) {
      toast({
        title: "Pedido vazio",
        description: "Adicione pelo menos um item ao pedido",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    
    try {
      // Prepara o pedido para envio
      const pedido: Pedido = {
        data: dataAtual,
        solicitante,
        itens: itensPedido,
        observacoes: observacoes || undefined
      }
      
      // Envia para a API
      const response = await fetch('/api/pedidos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pedido),
      })
      
      const result = await response.json()
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Erro ao criar pedido")
      }
      
      toast({
        title: "Pedido criado com sucesso",
        description: `Pedido ${result.data?.codigo} registrado no sistema`,
      })
      
      // Armazena o ID do pedido para possível envio por email
      setPedidoCriado({
        id: result.data.id,
        codigo: result.data.codigo
      })
      
      // Mostra opção de enviar por email
      setShowEmailForm(true)
      
      // Chama o callback de sucesso, se fornecido
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error("Erro ao finalizar pedido:", error)
      toast({
        title: "Erro ao finalizar pedido",
        description: error.message || "Ocorreu um erro ao tentar finalizar o pedido",
        variant: "destructive",
      })
      setShowEmailForm(false)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const enviarPorEmail = async () => {
    if (!pedidoCriado) return
    
    const emailDestinatario = form.getValues("emailDestinatario")
    
    // Validação opcional de email
    if (emailDestinatario && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailDestinatario)) {
      toast({
        title: "E-mail inválido",
        description: "Por favor, digite um endereço de e-mail válido ou deixe em branco para usar o e-mail padrão.",
        variant: "destructive",
      })
      return
    }
    
    setIsSendingEmail(true)
    
    try {
      // Enviar requisição para a API de exportação por email
      const response = await fetch('/api/pedidos/email-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pedidoId: pedidoCriado.id,
          destinatarios: emailDestinatario || undefined
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Erro ao enviar e-mail")
      }
      
      toast({
        title: "E-mail enviado com sucesso",
        description: `A planilha do pedido ${pedidoCriado.codigo} foi enviada por e-mail`,
      })
      
      // Fecha o modal e limpa o estado
      finalizarModal()
    } catch (error: any) {
      console.error("Erro ao enviar e-mail:", error)
      toast({
        title: "Erro ao enviar e-mail",
        description: error.message || "Ocorreu um erro ao tentar enviar o e-mail",
        variant: "destructive",
      })
    } finally {
      setIsSendingEmail(false)
    }
  }
  
  const finalizarModal = () => {
    // Limpa todos os estados
    form.reset()
    setItensPedido([])
    setProdutoSelecionado(null)
    setPedidoCriado(null)
    setShowEmailForm(false)
    onOpenChange(false)
  }

  // Resetar o estado quando o modal for aberto ou fechado
  useEffect(() => {
    if (!open) {
      form.reset()
      setItensPedido([])
      setProdutoSelecionado(null)
      setPedidoCriado(null)
      setShowEmailForm(false)
    } else {
      // Atualiza a data quando o modal é aberto
      const now = new Date()
      setDataAtual(format(now, "dd/MM/yyyy HH:mm:ss", { locale: ptBR }))
    }
  }, [open, form])

  return (
    <Dialog 
      open={open} 
      onOpenChange={(newOpen) => {
        if (isSubmitting || isSendingEmail) return; // Impede o fechamento durante submissão
        if (!newOpen) {
          finalizarModal()
        } else {
          onOpenChange(newOpen)
        }
      }}
    >
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {showEmailForm 
              ? "Enviar pedido por e-mail" 
              : "Solicitar Novo Pedido"}
          </DialogTitle>
          <DialogDescription>
            {showEmailForm 
              ? "Seu pedido foi criado com sucesso. Deseja enviar a planilha para algum e-mail específico?" 
              : "Preencha os dados do pedido e adicione os produtos desejados."}
          </DialogDescription>
        </DialogHeader>
        
        {showEmailForm ? (
          <div className="py-4 space-y-6">
            <Alert className="bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-600" />
              <AlertTitle>Pedido criado com sucesso!</AlertTitle>
              <AlertDescription>
                O pedido {pedidoCriado?.codigo} foi registrado no sistema. Agora você pode enviar a planilha de requisição por e-mail.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emailDestinatario">E-mail para envio</Label>
                <Input
                  id="emailDestinatario"
                  placeholder="Digite o e-mail ou deixe em branco para usar o padrão"
                  {...form.register("emailDestinatario")}
                />
                <p className="text-sm text-muted-foreground">
                  Se deixar em branco, será usado o e-mail configurado no sistema.
                </p>
              </div>
              
              <div className="flex flex-col space-y-2">
                <Button
                  onClick={enviarPorEmail}
                  disabled={isSendingEmail}
                  className="w-full"
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Enviar Planilha por E-mail
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={finalizarModal}
                  disabled={isSendingEmail}
                  className="w-full"
                >
                  Concluir sem enviar
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="solicitante"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Solicitante</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do solicitante" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <Label htmlFor="dataAtual">Data</Label>
                  <Input id="dataAtual" value={dataAtual} readOnly />
                </div>
              </div>
              
              <div className="border-t pt-4 mt-2">
                <h4 className="font-medium mb-4">Adicionar Produtos</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <FormField
                    control={form.control}
                    name="codigoProduto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código do Produto</FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              id="codigoProduto"
                              placeholder="Digite o código e pressione Enter"
                              {...field}
                              onKeyDown={handleCodigoKeyDown}
                              disabled={isSearching}
                            />
                          </FormControl>
                          {isSearching && (
                            <div className="absolute right-2 top-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="quantidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantidade</FormLabel>
                        <FormControl>
                          <Input
                            id="quantidade"
                            type="number"
                            step="0.01"
                            placeholder="Informe a quantidade"
                            {...field}
                            disabled={!produtoSelecionado}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {produtoSelecionado && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 bg-muted/30 p-3 rounded-md">
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <div className="text-sm font-medium">{produtoSelecionado.descricao}</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Unidade de Medida</Label>
                      <div className="text-sm font-medium">{produtoSelecionado.unidadeMedida}</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Endereço</Label>
                      <div className="text-sm font-medium">{produtoSelecionado.endereco}</div>
                    </div>
                  </div>
                )}
                <Button
                  type="button"
                  onClick={adicionarItem}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Item
                </Button>
              </div>
              
              {itensPedido.length > 0 && (
                <div className="border-t pt-4 mt-2">
                  <h4 className="font-medium mb-4">Itens do Pedido</h4>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Qtd</TableHead>
                          <TableHead>UM</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itensPedido.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.codigo}</TableCell>
                            <TableCell>{item.descricao}</TableCell>
                            <TableCell>{item.quantidade}</TableCell>
                            <TableCell>{item.unidadeMedida}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => removerItem(index)} disabled={isSubmitting}>
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              
              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Observações sobre o pedido" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Form>
        )}
        
        <DialogFooter>
          {showEmailForm ? null : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button 
                onClick={finalizarPedido} 
                disabled={itensPedido.length === 0 || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Finalizar Pedido
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}