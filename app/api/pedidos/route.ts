import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);


interface ItemPedido {
  codigo: string;
  descricao: string;
  quantidade: number;
  unidadeMedida: string;
  endereco: string;
}


interface Pedido {
  codigo?: string; 
  data?: string;   
  solicitante: string;
  itens: ItemPedido[];
  observacoes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const pedido: Pedido = await request.json();

    if (!pedido.solicitante || !pedido.itens || pedido.itens.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: "Dados incompletos. Solicitante e pelo menos um item são obrigatórios" 
      }, { status: 400 });
    }

    const { data: pedidoData, error: pedidoError } = await supabase
      .from('integracao_pedidos')
      .insert({
        codigo: pedido.codigo || null,
        data: new Date(),
        solicitante: pedido.solicitante,
        observacoes: pedido.observacoes || null
      })
      .select()
      .single();

    if (pedidoError) {
      throw new Error(`Erro ao criar pedido: ${pedidoError.message}`);
    }

    const itensPedido = pedido.itens.map(item => ({
      pedido_id: pedidoData.id,
      codigo_item: item.codigo,
      descricao: item.descricao,
      quantidade: item.quantidade,
      um: item.unidadeMedida,
      endereco: item.endereco
    }));

    const { error: itensError } = await supabase
      .from('integracao_pedidos_itens')
      .insert(itensPedido);

    if (itensError) {
      await supabase
        .from('integracao_pedidos')
        .delete()
        .eq('id', pedidoData.id);
        
      throw new Error(`Erro ao inserir itens do pedido: ${itensError.message}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: "Pedido criado com sucesso",
      data: {
        id: pedidoData.id,
        codigo: pedidoData.codigo,
        data: pedidoData.data
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Erro na API de pedidos:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Erro ao processar a requisição: ${error.message}` 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const codigo = searchParams.get('codigo');
    const solicitante = searchParams.get('solicitante');
    const status = searchParams.get('status');
    const dataInicio = searchParams.get('dataInicio');
    const dataFim = searchParams.get('dataFim');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('integracao_pedidos')
      .select(`
        id, 
        codigo, 
        data, 
        solicitante, 
        status, 
        observacoes,
        integracao_pedidos_itens (
          id, 
          codigo_item, 
          descricao, 
          quantidade, 
          um, 
          endereco
        )
      `)
      .order('data', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);

    if (codigo) {
      query = query.ilike('codigo', `%${codigo}%`);
    }
    
    if (solicitante) {
      query = query.ilike('solicitante', `%${solicitante}%`);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (dataInicio) {
      query = query.gte('data', dataInicio);
    }
    
    if (dataFim) {

      const dataFimObj = new Date(dataFim);
      dataFimObj.setDate(dataFimObj.getDate() + 1);
      query = query.lt('data', dataFimObj.toISOString());
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Erro ao buscar pedidos: ${error.message}`);
    }

    const pedidosFormatados = data.map(pedido => ({
      id: pedido.id,
      codigo: pedido.codigo,
      data: pedido.data,
      solicitante: pedido.solicitante,
      status: pedido.status,
      observacoes: pedido.observacoes,
      itens: pedido.integracao_pedidos_itens.map((item: any) => ({
        codigo: item.codigo_item,
        descricao: item.descricao,
        quantidade: item.quantidade,
        unidadeMedida: item.um,
        endereco: item.endereco
      }))
    }));

    return NextResponse.json({ 
      success: true, 
      data: pedidosFormatados
    });
  } catch (error: any) {
    console.error('Erro na API de listagem de pedidos:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Erro ao processar a requisição: ${error.message}` 
    }, { status: 500 });
  }
}