import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;


const supabase = createClient(supabaseUrl, supabaseServiceKey);


export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const { status, observacoes } = await request.json();

    if (!id) {
      return NextResponse.json({ 
        success: false, 
        message: "ID do pedido é obrigatório" 
      }, { status: 400 });
    }

    // Verifica se o pedido existe
    const { data: existingPedido, error: findError } = await supabase
      .from('integracao_pedidos')
      .select('*')
      .eq('id', id)
      .single();

    if (findError) {
      return NextResponse.json({ 
        success: false, 
        message: `Pedido não encontrado: ${findError.message}` 
      }, { status: 404 });
    }

    // Prepara os dados para atualização
    const updateData: any = {};
    
    if (status !== undefined) {
      updateData.status = status;
    }
    
    if (observacoes !== undefined) {
      updateData.observacoes = observacoes;
    }

    // Atualiza o pedido
    const { data, error } = await supabase
      .from('integracao_pedidos')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      throw new Error(`Erro ao atualizar pedido: ${error.message}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: "Pedido atualizado com sucesso",
      data
    });
    
  } catch (error: any) {
    console.error('Erro na API de atualização de pedido:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Erro ao processar a requisição: ${error.message}` 
    }, { status: 500 });
  }
}

// GET - Obter detalhes de um pedido específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (!id) {
      return NextResponse.json({ 
        success: false, 
        message: "ID do pedido é obrigatório" 
      }, { status: 400 });
    }

    // Busca o pedido com seus itens
    const { data, error } = await supabase
      .from('integracao_pedidos')
      .select(`
        id, 
        codigo, 
        data, 
        solicitante, 
        status, 
        observacoes,
        created_at,
        updated_at,
        integracao_pedidos_itens (
          id, 
          codigo_item, 
          descricao, 
          quantidade, 
          um, 
          endereco
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ 
        success: false, 
        message: `Pedido não encontrado: ${error.message}` 
      }, { status: 404 });
    }

    // Formatar os dados para o frontend
    const formattedPedido = {
      id: data.id,
      codigo: data.codigo,
      data: data.data,
      solicitante: data.solicitante,
      status: data.status,
      observacoes: data.observacoes,
      created_at: data.created_at,
      updated_at: data.updated_at,
      itens: data.integracao_pedidos_itens.map((item: any) => ({
        codigo: item.codigo_item,
        descricao: item.descricao,
        quantidade: item.quantidade,
        unidadeMedida: item.um,
        endereco: item.endereco
      }))
    };

    return NextResponse.json({ 
      success: true, 
      data: formattedPedido
    });
    
  } catch (error: any) {
    console.error('Erro na API de obtenção de pedido:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Erro ao processar a requisição: ${error.message}` 
    }, { status: 500 });
  }
}

// DELETE - Excluir um pedido
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (!id) {
      return NextResponse.json({ 
        success: false, 
        message: "ID do pedido é obrigatório" 
      }, { status: 400 });
    }

    // Verifica se o pedido existe
    const { data: existingPedido, error: findError } = await supabase
      .from('integracao_pedidos')
      .select('*')
      .eq('id', id)
      .single();

    if (findError) {
      return NextResponse.json({ 
        success: false, 
        message: `Pedido não encontrado: ${findError.message}` 
      }, { status: 404 });
    }

    // Devido à constraint de chave estrangeira com ON DELETE CASCADE,
    // os itens do pedido serão excluídos automaticamente
    const { error } = await supabase
      .from('integracao_pedidos')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao excluir pedido: ${error.message}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: "Pedido excluído com sucesso"
    });
    
  } catch (error: any) {
    console.error('Erro na API de exclusão de pedido:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Erro ao processar a requisição: ${error.message}` 
    }, { status: 500 });
  }
}