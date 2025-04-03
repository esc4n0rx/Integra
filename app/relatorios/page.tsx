"use client"
import React, { useState, useEffect } from "react"
import { ArrowLeft, Download, Search, Calendar, Edit, Check, AlertCircle, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Skeleton } from "@/components/ui/skeleton"
import { format, isValid, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { usePedidos } from "@/hooks/use-pedidos"
import { Pedido, PedidoStatus, ItemPedido } from "@/lib/pedidos"
import { toast } from "@/components/ui/use-toast"

export default function Relatorios() {
  const router = useRouter()
  const { isLoading, error, getPedidos } = usePedidos()
  
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [filteredPedidos, setFilteredPedidos] = useState<Pedido[]>([])
  const [solicitanteFilter, setSolicitanteFilter] = useState("")
  const [codigoFilter, setCodigoFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateInicioFilter, setDateInicioFilter] = useState<Date | undefined>(undefined)
  const [dateFimFilter, setDateFimFilter] = useState<Date | undefined>(undefined)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  
  // Estado para o modal de edição
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [newStatus, setNewStatus] = useState("")
  const [observacoes, setObservacoes] = useState("")

  // Carrega os pedidos do Supabase
  const fetchPedidos = async (customFilters?: any) => {
    try {
      // Use filtros personalizados ou os filtros de estado
      const filters = customFilters || {
        limit: 100,
        codigo: codigoFilter !== "" ? codigoFilter : undefined,
        solicitante: solicitanteFilter !== "" ? solicitanteFilter : undefined,
        status: statusFilter === "all" ? undefined : (statusFilter !== "" ? statusFilter : undefined),
        dataInicio: dateInicioFilter ? format(dateInicioFilter, "yyyy-MM-dd") : undefined,
        dataFim: dateFimFilter ? format(dateFimFilter, "yyyy-MM-dd") : undefined
      };
      
      console.log("Buscando pedidos com filtros:", filters);
      
      const result = await getPedidos(filters);
      
      setPedidos(result);
      setFilteredPedidos(result);
    } catch (err) {
      console.error("Erro ao buscar pedidos:", err);
      toast({
        title: "Erro ao carregar pedidos",
        description: "Não foi possível carregar os pedidos. Tente novamente mais tarde.",
        variant: "destructive"
      });
    }
  }

  // Carrega os pedidos ao montar o componente
  useEffect(() => {
    fetchPedidos()
  }, [])

  // Aplica filtros manualmente (complementar à filtragem do servidor)
  const applyFilters = () => {
    // Ajusta o statusFilter se for "all"
    const adjustedStatusFilter = statusFilter === "all" ? "" : statusFilter;
    
    fetchPedidos({
      codigo: codigoFilter !== "" ? codigoFilter : undefined,
      solicitante: solicitanteFilter !== "" ? solicitanteFilter : undefined,
      status: adjustedStatusFilter !== "" ? adjustedStatusFilter : undefined,
      dataInicio: dateInicioFilter ? format(dateInicioFilter, "yyyy-MM-dd") : undefined,
      dataFim: dateFimFilter ? format(dateFimFilter, "yyyy-MM-dd") : undefined
    })
  }

  const clearFilters = () => {
    setSolicitanteFilter("")
    setCodigoFilter("")
    setStatusFilter("all") // Mudamos para "all" em vez de string vazia
    setDateInicioFilter(undefined)
    setDateFimFilter(undefined)
    
    // Após limpar os filtros, recarrega todos os pedidos
    setTimeout(() => {
      fetchPedidos()
    }, 100)
  }

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const openEditModal = (pedido: Pedido) => {
    setSelectedPedido(pedido)
    setNewStatus(pedido.status || PedidoStatus.PENDENTE)
    setObservacoes(pedido.observacoes || "")
    setEditModalOpen(true)
  }

  const updatePedidoStatus = async () => {
    if (!selectedPedido) return
    
    setIsUpdating(true)
    
    try {
      // Implementação do update no Supabase
      // Esta é uma simulação - você precisará implementar a API real
      const response = await fetch(`/api/pedidos/${selectedPedido.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          observacoes
        })
      })
      
      if (!response.ok) {
        throw new Error('Falha ao atualizar o status do pedido')
      }
      
      // Atualiza a lista local de pedidos
      setPedidos(pedidos.map(p => {
        if (p.id === selectedPedido.id) {
          return {
            ...p,
            status: newStatus,
            observacoes
          }
        }
        return p
      }))
      
      // Atualiza também os pedidos filtrados
      setFilteredPedidos(filteredPedidos.map(p => {
        if (p.id === selectedPedido.id) {
          return {
            ...p,
            status: newStatus,
            observacoes
          }
        }
        return p
      }))
      
      toast({
        title: "Status atualizado",
        description: `O pedido ${selectedPedido.codigo} foi atualizado com sucesso.`
      })
      
      setEditModalOpen(false)
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      toast({
        title: "Erro ao atualizar",
        description: "Ocorreu um erro ao tentar atualizar o status do pedido.",
        variant: "destructive"
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const exportToExcel = async () => {
    try {
      // Esta é uma implementação básica - em produção usaria uma biblioteca como xlsx
      // Você pode implementar isso no servidor para gerar um Excel real
      const response = await fetch('/api/pedidos/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pedidos: filteredPedidos
        })
      })
      
      if (!response.ok) {
        throw new Error('Falha ao gerar relatório')
      }
      
      // Download do arquivo
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `relatorio-pedidos-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Erro ao exportar:', error)
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível exportar os dados para Excel.",
        variant: "destructive"
      })
    }
  }

  // Função auxiliar para formatar a data
  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString)
      if (!isValid(date)) return dateString // Retorna string original se não for uma data válida
      return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR })
    } catch (error) {
      return dateString // Em caso de erro, retorna a string original
    }
  }

  // Função para renderizar o badge de status com a cor apropriada
  const renderStatusBadge = (status: string = PedidoStatus.PENDENTE) => {
    let colorClass = ""
    
    switch (status) {
      case PedidoStatus.PENDENTE:
        colorClass = "bg-yellow-500 hover:bg-yellow-600"
        break
      case PedidoStatus.EM_PROCESSAMENTO:
        colorClass = "bg-blue-500 hover:bg-blue-600"
        break
      case PedidoStatus.SEPARADO:
        colorClass = "bg-purple-500 hover:bg-purple-600"
        break
      case PedidoStatus.ENTREGUE:
        colorClass = "bg-green-500 hover:bg-green-600"
        break
      case PedidoStatus.CANCELADO:
        colorClass = "bg-red-500 hover:bg-red-600"
        break
      default:
        colorClass = "bg-gray-500 hover:bg-gray-600"
    }
    
    return (
      <Badge className={`${colorClass} cursor-pointer`}>
        {status}
      </Badge>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="icon" onClick={() => router.push("/")} className="mr-4">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Relatório de Pedidos</h1>
        <Button variant="outline" className="ml-auto" onClick={exportToExcel}>
          <Download className="h-4 w-4 mr-2" />
          Exportar Excel
        </Button>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="codigo"
                  placeholder="Filtrar por código"
                  className="pl-8"
                  value={codigoFilter}
                  onChange={(e) => setCodigoFilter(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="solicitante">Solicitante</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="solicitante"
                  placeholder="Filtrar por solicitante"
                  className="pl-8"
                  value={solicitanteFilter}
                  onChange={(e) => setSolicitanteFilter(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value={PedidoStatus.PENDENTE}>{PedidoStatus.PENDENTE}</SelectItem>
                    <SelectItem value={PedidoStatus.EM_PROCESSAMENTO}>{PedidoStatus.EM_PROCESSAMENTO}</SelectItem>
                    <SelectItem value={PedidoStatus.SEPARADO}>{PedidoStatus.SEPARADO}</SelectItem>
                    <SelectItem value={PedidoStatus.ENTREGUE}>{PedidoStatus.ENTREGUE}</SelectItem>
                    <SelectItem value={PedidoStatus.CANCELADO}>{PedidoStatus.CANCELADO}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateInicioFilter ? format(dateInicioFilter, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecionar data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent mode="single" selected={dateInicioFilter} onSelect={setDateInicioFilter} locale={ptBR} />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label>Data Final</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateFimFilter ? format(dateFimFilter, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecionar data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent mode="single" selected={dateFimFilter} onSelect={setDateFimFilter} locale={ptBR} />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="flex items-end gap-2">
              <Button onClick={applyFilters} className="mb-0.5">
                <Filter className="h-4 w-4 mr-2" />
                Aplicar Filtros
              </Button>
              <Button variant="secondary" onClick={clearFilters} className="mb-0.5">
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            // Esqueleto de carregamento
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-8 w-40" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPedidos.length > 0 ? (
                  filteredPedidos.map((pedido) => (
                    <React.Fragment key={pedido.id}>
                      <TableRow>
                        <TableCell className="font-medium">{pedido.codigo}</TableCell>
                        <TableCell>{formatDate(pedido.data)}</TableCell>
                        <TableCell>{pedido.solicitante}</TableCell>
                        <TableCell>
                          <div onClick={() => openEditModal(pedido)}>
                            {renderStatusBadge(pedido.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{pedido.itens.length} itens</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => pedido.id && toggleRow(pedido.id)}>
                              {pedido.id && expandedRows[pedido.id] ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEditModal(pedido)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {pedido.id && expandedRows[pedido.id] && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/30 p-4">
                            <div className="text-sm">
                              <div className="flex justify-between items-center mb-2">
                                <h4 className="font-medium">Detalhes do Pedido</h4>
                                {pedido.observacoes && (
                                  <div className="bg-yellow-100 text-yellow-800 p-2 rounded text-sm flex items-start">
                                    <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                                    <span>{pedido.observacoes}</span>
                                  </div>
                                )}
                              </div>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Código</TableHead>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead className="text-right">Quantidade</TableHead>
                                    <TableHead>UM</TableHead>
                                    <TableHead>Endereço</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {pedido.itens.map((item, index) => (
                                    <TableRow key={index}>
                                      <TableCell>{item.codigo}</TableCell>
                                      <TableCell>{item.descricao}</TableCell>
                                      <TableCell className="text-right">{item.quantidade}</TableCell>
                                      <TableCell>{item.unidadeMedida}</TableCell>
                                      <TableCell>{item.endereco}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      {error ? (
                        <div className="flex flex-col items-center">
                          <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
                          <p>Erro ao carregar pedidos: {error}</p>
                        </div>
                      ) : (
                        <p>Nenhum pedido encontrado</p>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Modal de Edição */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Pedido {selectedPedido?.codigo}</DialogTitle>
            <DialogDescription>
              Altere o status do pedido ou adicione observações.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
          <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select 
                value={newStatus || PedidoStatus.PENDENTE} 
                onValueChange={setNewStatus}
                defaultValue={PedidoStatus.PENDENTE}
              >
                <SelectTrigger id="edit-status">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PedidoStatus.PENDENTE}>{PedidoStatus.PENDENTE}</SelectItem>
                  <SelectItem value={PedidoStatus.EM_PROCESSAMENTO}>{PedidoStatus.EM_PROCESSAMENTO}</SelectItem>
                  <SelectItem value={PedidoStatus.SEPARADO}>{PedidoStatus.SEPARADO}</SelectItem>
                  <SelectItem value={PedidoStatus.ENTREGUE}>{PedidoStatus.ENTREGUE}</SelectItem>
                  <SelectItem value={PedidoStatus.CANCELADO}>{PedidoStatus.CANCELADO}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-observacoes">Observações</Label>
              <Input
                id="edit-observacoes"
                placeholder="Adicione observações"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={isUpdating}>
              Cancelar
            </Button>
            <Button onClick={updatePedidoStatus} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                  Atualizando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}