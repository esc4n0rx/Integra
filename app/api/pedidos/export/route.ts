import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { pedidos: pedidosFiltrados, filtros } = await request.json();
    
    let pedidos = pedidosFiltrados;
    
    if (!pedidos && filtros) {

      let query = supabase
        .from('integracao_pedidos')
        .select(`
          id, 
          codigo, 
          data, 
          solicitante, 
          status, 
          observacoes,
          created_at,
          integracao_pedidos_itens (
            id, 
            codigo_item, 
            descricao, 
            quantidade, 
            um, 
            endereco
          )
        `);
      
      if (filtros.codigo) {
        query = query.ilike('codigo', `%${filtros.codigo}%`);
      }
      
      if (filtros.solicitante) {
        query = query.ilike('solicitante', `%${filtros.solicitante}%`);
      }
      
      if (filtros.status) {
        query = query.eq('status', filtros.status);
      }
      
      if (filtros.dataInicio) {
        query = query.gte('data', filtros.dataInicio);
      }
      
      if (filtros.dataFim) {
        const dataFimObj = new Date(filtros.dataFim);
        dataFimObj.setDate(dataFimObj.getDate() + 1);
        query = query.lt('data', dataFimObj.toISOString());
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Erro ao buscar pedidos: ${error.message}`);
      }
      
      pedidos = data.map((pedido: any) => ({
        id: pedido.id,
        codigo: pedido.codigo,
        data: pedido.data,
        solicitante: pedido.solicitante,
        status: pedido.status || 'Pendente',
        observacoes: pedido.observacoes || '',
        itens: pedido.integracao_pedidos_itens.map((item: any) => ({
          codigo: item.codigo_item,
          descricao: item.descricao,
          quantidade: item.quantidade,
          unidadeMedida: item.um,
          endereco: item.endereco
        }))
      }));
    }
    
    if (!pedidos || pedidos.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Nenhum pedido para exportar' 
      }, { status: 400 });
    }
    
    const resumoPedidos = pedidos.map((pedido: any) => ({
      'Código': pedido.codigo,
      'Data': formatarData(pedido.data),
      'Solicitante': pedido.solicitante,
      'Status': pedido.status,
      'Observações': pedido.observacoes,
      'Quantidade de Itens': pedido.itens.length,
      'Total de Itens': pedido.itens.reduce((sum: number, item: any) => sum + parseFloat(item.quantidade || 0), 0)
    }));
    
    const detalhesItens: any[] = [];
    pedidos.forEach((pedido: any) => {
      pedido.itens.forEach((item: any) => {
        detalhesItens.push({
          'Código Pedido': pedido.codigo,
          'Data Pedido': formatarData(pedido.data),
          'Solicitante': pedido.solicitante,
          'Status': pedido.status,
          'Código Item': item.codigo,
          'Descrição': item.descricao,
          'Quantidade': item.quantidade,
          'UM': item.unidadeMedida,
          'Endereço': item.endereco
        });
      });
    });
    

    const wb = XLSX.utils.book_new();
    

    const resumoWs = XLSX.utils.json_to_sheet(resumoPedidos);
    XLSX.utils.book_append_sheet(wb, resumoWs, "Resumo Pedidos");
    

    const detalhesWs = XLSX.utils.json_to_sheet(detalhesItens);
    XLSX.utils.book_append_sheet(wb, detalhesWs, "Detalhes Itens");
    

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="relatorio-pedidos-${new Date().toISOString().slice(0, 10)}.xlsx"`
      }
    });
    
  } catch (error: any) {
    console.error('Erro na API de exportação:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Erro ao processar a exportação: ${error.message}` 
    }, { status: 500 });
  }
}


function formatarData(dataString: string): string {
  try {
    const data = new Date(dataString);
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dataString || '';
  }
}