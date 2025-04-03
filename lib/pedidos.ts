// Interface para o produto
export interface Produto {
  codigo: string;
  descricao: string;
  unidadeMedida: string; // Será mapeado para 'um' no banco de dados
  endereco: string;
}

// Interface para o item do pedido
export interface ItemPedido {
  codigo: string;
  descricao: string;
  quantidade: number;
  unidadeMedida: string; // Será mapeado para 'um' no banco de dados
  endereco: string;
}

// Interface para o pedido completo
export interface Pedido {
  id?: string;
  codigo?: string;
  data: string;
  solicitante: string;
  status?: string;
  observacoes?: string;
  itens: ItemPedido[];
}

// Tipo para a resposta da API ao buscar um produto
export interface ApiProdutoResponse {
  success: boolean;
  message?: string;
  data?: Produto;
}

// Tipo para a resposta da API ao buscar vários produtos
export interface ApiProdutosResponse {
  success: boolean;
  message?: string;
  data?: Produto[];
}

// Tipo para a resposta da API ao criar um pedido
export interface ApiPedidoCreateResponse {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    codigo: string;
    data: string;
  };
}

// Tipo para a resposta da API ao listar pedidos
export interface ApiPedidosResponse {
  success: boolean;
  message?: string;
  data?: Pedido[];
}

// Enums para status do pedido
export enum PedidoStatus {
  PENDENTE = 'Pendente',
  EM_PROCESSAMENTO = 'Em Processamento',
  SEPARADO = 'Separado',
  ENTREGUE = 'Entregue',
  CANCELADO = 'Cancelado'
}