import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Inicializar o cliente Supabase com variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Buscar um produto pelo código
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const codigo = searchParams.get('codigo');

    if (!codigo) {
      return NextResponse.json({ 
        success: false, 
        message: "Parâmetro 'codigo' é obrigatório" 
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('integracao_itens')
      .select('*')
      .eq('codigo', codigo)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // PGRST116 é o código para "não encontrado" ao usar .single()
        return NextResponse.json({ 
          success: false, 
          message: `Produto com código ${codigo} não encontrado` 
        }, { status: 404 });
      }
      
      throw new Error(`Erro ao buscar produto: ${error.message}`);
    }

    // Mapeamento para o formato esperado pelo frontend
    const produto = {
      codigo: data.codigo,
      descricao: data.descricao,
      unidadeMedida: data.um,
      endereco: data.endereco
    };

    return NextResponse.json({ 
      success: true, 
      data: produto 
    });
  } catch (error: any) {
    console.error('Erro na API de produtos:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Erro ao processar a requisição: ${error.message}` 
    }, { status: 500 });
  }
}

// Buscar todos os produtos (opcional, pode ser útil para preenchimento automático)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filtro = "", limit = 20 } = body;

    let query = supabase
      .from('integracao_itens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (filtro) {
      query = query.or(`codigo.ilike.%${filtro}%,descricao.ilike.%${filtro}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar produtos: ${error.message}`);
    }

    // Mapeamento para o formato esperado pelo frontend
    const produtos = data.map(item => ({
      codigo: item.codigo,
      descricao: item.descricao,
      unidadeMedida: item.um,
      endereco: item.endereco
    }));

    return NextResponse.json({ 
      success: true, 
      data: produtos 
    });
  } catch (error: any) {
    console.error('Erro na API de busca de produtos:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Erro ao processar a requisição: ${error.message}` 
    }, { status: 500 });
  }
}