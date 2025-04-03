import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configurar o transporte de email com Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD, // Senha de aplicativo do Gmail
  },
});

function gerarNumeroAleatorio(digitos: number): string {
  return Math.floor(Math.random() * Math.pow(10, digitos)).toString().padStart(digitos, '0');
}

function gerarEAN(): string {
  return gerarNumeroAleatorio(14);
}

function gerarRemessa(): string {
  return gerarNumeroAleatorio(8);
}

function gerarOrdem(): number {
  return Math.floor(Math.random() * 100) + 1;
}

export async function POST(request: NextRequest) {
  try {
    const { pedidoId, destinatarios } = await request.json();
    
    if (!pedidoId) {
      return NextResponse.json({ 
        success: false, 
        message: "ID do pedido é obrigatório" 
      }, { status: 400 });
    }
    
    const emailDestinatarios = destinatarios || process.env.DEFAULT_EMAIL_DESTINATARIO;
    
    if (!emailDestinatarios) {
      return NextResponse.json({ 
        success: false, 
        message: "Destinatário de email não configurado" 
      }, { status: 400 });
    }
    
    // Buscar pedido no Supabase
    const { data: pedido, error: pedidoError } = await supabase
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
      .eq('id', pedidoId)
      .single();
    
    if (pedidoError || !pedido) {
      return NextResponse.json({ 
        success: false, 
        message: `Pedido não encontrado: ${pedidoError?.message || 'ID inválido'}` 
      }, { status: 404 });
    }
    
    const remessaNumero = gerarRemessa();
    const planilhaDados = pedido.integracao_pedidos_itens.map((item: any, index: number) => ({
      'Loja': 'PRODUÇÃO',
      'Remessa': remessaNumero,
      'Local': 'Sem Local',
      'Ordem': gerarOrdem(),
      'Posição Depósito': item.endereco,
      'Código': item.codigo_item,
      'Descrição do Produto': item.descricao,
      'UM': item.um,
      'Qtde Emb': item.quantidade,
      'Qtde CX': item.quantidade,
      'Qtde UM': item.quantidade,
      'Estoque': 10000,
      'EAN': gerarEAN()
    }));
    
    // Criar workbook e adicionar planilha
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(planilhaDados);
    
    // Definir larguras de coluna para melhor visualização
    const wscols = [
      { wch: 15 }, // Loja
      { wch: 15 }, // Remessa
      { wch: 15 }, // Local
      { wch: 10 }, // Ordem
      { wch: 20 }, // Posição Depósito
      { wch: 15 }, // Código
      { wch: 40 }, // Descrição do Produto
      { wch: 10 }, // UM
      { wch: 10 }, // Qtde Emb
      { wch: 10 }, // Qtde CX
      { wch: 10 }, // Qtde UM
      { wch: 10 }, // Estoque
      { wch: 20 }  // EAN
    ];
    ws['!cols'] = wscols;
    
    XLSX.utils.book_append_sheet(wb, ws, "Requisição");
    
    // Converter para buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // Nome do arquivo
    const nomeArquivo = `Requisicao_${pedido.codigo.replace(/\//g, '-')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    
    // Preparar o email
    const dataFormatada = new Date(pedido.data).toLocaleDateString('pt-BR');
    const destinatariosArray = Array.isArray(emailDestinatarios) 
      ? emailDestinatarios 
      : [emailDestinatarios];
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
        <h2 style="color: #333;">Novo Pedido Gerado</h2>
        <p>Um novo pedido foi gerado no sistema.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Número do Pedido:</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${pedido.codigo}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Data:</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${dataFormatada}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Solicitante:</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${pedido.solicitante}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Total de Itens:</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${pedido.integracao_pedidos_itens.length}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Observações:</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${pedido.observacoes || 'Nenhuma observação'}</td>
          </tr>
        </table>
        
        <p>A planilha de requisição está anexada a este email.</p>
        
        <p style="color: #777; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
          Este é um email automático, por favor não responda.
        </p>
      </div>
    `;

    // Enviar email
    const info = await transporter.sendMail({
      from: `"Sistema de Pedidos" <${process.env.GMAIL_USER}>`,
      to: destinatariosArray.join(', '),
      subject: `Novo Pedido Gerado - ${pedido.codigo} - ${dataFormatada}`,
      text: `
        Olá,

        Um novo pedido foi gerado no sistema.

        Número do Pedido: ${pedido.codigo}
        Data: ${dataFormatada}
        Solicitante: ${pedido.solicitante}
        Total de Itens: ${pedido.integracao_pedidos_itens.length}
        
        Observações: ${pedido.observacoes || 'Nenhuma observação'}

        A planilha de requisição está anexada a este email.

        Este é um email automático, por favor não responda.
      `,
      html: htmlContent,
      attachments: [
        {
          filename: nomeArquivo,
          content: buffer
        }
      ]
    });
    
    // Atualizar o status do pedido para indicar que foi enviado por email
    await supabase
      .from('integracao_pedidos')
      .update({ 
        status: 'Em Processamento',
        updated_at: new Date().toISOString()
      })
      .eq('id', pedido.id);
    
    return NextResponse.json({ 
      success: true, 
      message: "Pedido enviado por email com sucesso",
      emailId: info.messageId,
      filename: nomeArquivo
    });
    
  } catch (error: any) {
    console.error('Erro na API de exportação por email:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Erro ao processar a requisição: ${error.message}` 
    }, { status: 500 });
  }
}