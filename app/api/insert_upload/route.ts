import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('Conectando ao Supabase em:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseServiceKey);


interface Item {
  endereco: string;
  codigo: string;
  descricao: string;
  um: string;
}

function validateItem(item: any): item is Item {
  const validation = (
    typeof item.endereco === 'string' && item.endereco.trim() !== '' &&
    typeof item.codigo === 'string' && item.codigo.trim() !== '' &&
    typeof item.descricao === 'string' && item.descricao.trim() !== '' &&
    typeof item.um === 'string' && item.um.trim() !== ''
  );
  
  if (!validation) {
    console.log('Item inválido:', item);
  }
  
  return validation;
}

async function insertItem(item: Item) {
  console.log('Tentando inserir item na tabela integracao_itens:', item);
  
  try {

    const { data: tableCheck, error: tableError } = await supabase
      .from('integracao_itens')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('Erro ao verificar tabela:', tableError);
      throw new Error(`A tabela integracao_itens não parece existir ou há um problema de acesso: ${tableError.message}`);
    }
    
    const { data, error } = await supabase
      .from('integracao_itens')
      .insert([item]);
    
    if (error) {
      console.error('Erro Supabase completo:', JSON.stringify(error));
      throw new Error(`Erro ao inserir item: ${error.message || error.code || 'Erro desconhecido'}`);
    }
    
    const { data: insertedItem, error: selectError } = await supabase
      .from('integracao_itens')
      .select('*')
      .eq('codigo', item.codigo)
      .single();
    
    if (selectError) {
      console.error('Erro ao buscar item inserido:', selectError);
    }
    
    console.log('Item inserido com sucesso:', insertedItem);
    return insertedItem;
  } catch (err: any) {
    console.error('Erro ao inserir item (try/catch):', err);
    throw err;
  }
}


function processExcelFile(buffer: ArrayBuffer): Item[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log('Dados brutos do Excel (primeiras 2 linhas):', 
    rawData.slice(0, 2).map(row => JSON.stringify(row)));
  
  if (rawData.length < 2) {
    throw new Error('Arquivo Excel vazio ou sem dados suficientes');
  }
  
  const headers = rawData[0].map((h: string) => 
    typeof h === 'string' ? h.toLowerCase().trim() : String(h).toLowerCase().trim());
  
  console.log('Cabeçalhos identificados:', headers);
  
  const requiredColumns = ['endereco', 'codigo', 'descricao', 'um'];
  
  for (const col of requiredColumns) {
    if (!headers.includes(col)) {
      throw new Error(`Coluna obrigatória '${col}' não encontrada no arquivo Excel. Colunas disponíveis: ${headers.join(', ')}`);
    }
  }
  
  const items: Item[] = [];
  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length === 0 || row.every((cell: any) => cell === null || cell === undefined || cell === '')) {
      continue;
    }
    
    const item: any = {};
    for (let j = 0; j < headers.length; j++) {
      if (requiredColumns.includes(headers[j]) && j < row.length) {
        item[headers[j]] = String(row[j] != null ? row[j] : '').trim();
      }
    }
    
    if (validateItem(item)) {
      items.push(item);
    } else {
      console.warn(`Linha ${i + 1} ignorada por dados inválidos:`, item);
    }
  }
  
  console.log(`Processadas ${rawData.length - 1} linhas, ${items.length} itens válidos encontrados`);
  return items;
}

export async function POST(request: NextRequest) {
  console.log('Recebido POST request para inserir itens');
  try {
    const contentType = request.headers.get('content-type') || '';
    console.log('Content-Type:', contentType);
    
    if (contentType.includes('application/json')) {
      console.log('Processando JSON payload');
      const body = await request.json();
      console.log('Dados recebidos:', body);
      
      if (validateItem(body)) {
        const data = await insertItem(body);
        return NextResponse.json({ 
          success: true, 
          message: 'Item inserido com sucesso', 
          data 
        }, { status: 201 });
      } else {
        return NextResponse.json({ 
          success: false, 
          message: 'Dados inválidos. Todos os campos são obrigatórios' 
        }, { status: 400 });
      }
    } 
    else if (contentType.includes('multipart/form-data')) {
      console.log('Processando upload de arquivo Excel');
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      
      if (!file) {
        return NextResponse.json({ 
          success: false, 
          message: 'Nenhum arquivo enviado' 
        }, { status: 400 });
      }
      
      console.log('Arquivo recebido:', file.name, 'tamanho:', file.size, 'bytes');
      
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
        return NextResponse.json({ 
          success: false, 
          message: 'Apenas arquivos Excel (.xlsx ou .xls) são permitidos' 
        }, { status: 400 });
      }
      
      const buffer = await file.arrayBuffer();
      const items = processExcelFile(buffer);
      
      if (items.length === 0) {
        return NextResponse.json({ 
          success: false, 
          message: 'Nenhum item válido encontrado no arquivo' 
        }, { status: 400 });
      }
      
      console.log(`Tentando inserir ${items.length} itens no Supabase`);
      
      try {
      
        const batchSize = 50;
        let insertedCount = 0;
        
        for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize);
          console.log(`Inserindo lote ${i/batchSize + 1} com ${batch.length} itens`);
          
          const { data, error } = await supabase
            .from('integracao_itens') 
            .insert(batch);
          
          if (error) {
            console.error('Erro ao inserir lote:', error);
            throw new Error(`Erro ao inserir itens em lote: ${error.message || error.code || JSON.stringify(error)}`);
          }
          
          insertedCount += batch.length;
          console.log(`Progresso: ${insertedCount}/${items.length} itens inseridos`);
        }
        
        return NextResponse.json({ 
          success: true, 
          message: `${insertedCount} itens inseridos com sucesso`, 
          count: insertedCount 
        }, { status: 201 });
      } catch (batchError) {
        console.error('Erro ao processar lotes:', batchError);
        throw batchError;
      }
    } else {
      return NextResponse.json({ 
        success: false, 
        message: `Tipo de conteúdo não suportado: ${contentType}` 
      }, { status: 415 });
    }
  } catch (error: any) {
    console.error('Erro na API:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Erro ao processar a requisição: ${error.message || 'Erro desconhecido'}`,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}