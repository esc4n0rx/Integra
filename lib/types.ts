export interface Produto {
  codigo: string
  descricao: string
  unidadeMedida: string
  endereco: string
}

export interface ItemPedido {
  codigo: string
  descricao: string
  unidadeMedida: string
  endereco: string
  quantidade: number
}

export interface Pedido {
  id: string
  data: string
  solicitante: string
  itens: ItemPedido[]
}

