import { useState, useCallback } from 'react';
import { 
  Produto, 
  ItemPedido, 
  Pedido, 
  ApiProdutoResponse, 
  ApiProdutosResponse,
  ApiPedidoCreateResponse,
  ApiPedidosResponse
} from '@/lib/pedidos';

export const usePedidos = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Busca um produto pelo código
   */
  const getProdutoByCodigo = useCallback(async (codigo: string): Promise<Produto | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/produtos?codigo=${encodeURIComponent(codigo)}`);
      const result: ApiProdutoResponse = await response.json();
      
      if (!result.success || !result.data) {
        setError(result.message || 'Produto não encontrado');
        return null;
      }
      
      return result.data;
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar produto');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Busca produtos com filtro
   */
  const getProdutos = useCallback(async (filtro: string = '', limit: number = 20): Promise<Produto[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/produtos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filtro, limit }),
      });
      
      const result: ApiProdutosResponse = await response.json();
      
      if (!result.success || !result.data) {
        setError(result.message || 'Erro ao buscar produtos');
        return [];
      }
      
      return result.data;
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar produtos');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Cria um novo pedido
   */
  const criarPedido = useCallback(async (pedido: Pedido): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/pedidos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pedido),
      });
      
      const result: ApiPedidoCreateResponse = await response.json();
      
      if (!result.success || !result.data) {
        setError(result.message || 'Erro ao criar pedido');
        return null;
      }
      
      return result.data.codigo;
    } catch (err: any) {
      setError(err.message || 'Erro ao criar pedido');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Busca pedidos com filtros opcionais
   */
  const getPedidos = useCallback(async (
    filtros: {
      codigo?: string;
      solicitante?: string;
      status?: string;
      dataInicio?: string;
      dataFim?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Pedido[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Construir a URL com os parâmetros de consulta
      const params = new URLSearchParams();
      
      if (filtros.codigo) params.append('codigo', filtros.codigo);
      if (filtros.solicitante) params.append('solicitante', filtros.solicitante);
      if (filtros.status) params.append('status', filtros.status);
      if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio);
      if (filtros.dataFim) params.append('dataFim', filtros.dataFim);
      if (filtros.limit) params.append('limit', filtros.limit.toString());
      if (filtros.offset) params.append('offset', filtros.offset.toString());
      
      const url = `/api/pedidos?${params.toString()}`;
      
      const response = await fetch(url);
      const result: ApiPedidosResponse = await response.json();
      
      if (!result.success || !result.data) {
        setError(result.message || 'Erro ao buscar pedidos');
        return [];
      }
      
      return result.data;
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar pedidos');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    getProdutoByCodigo,
    getProdutos,
    criarPedido,
    getPedidos,
  };
};