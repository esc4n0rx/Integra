// Interface para o item de integração
export interface IntegracaoItem {
    id?: string;
    endereco: string;
    codigo: string;
    descricao: string;
    um: string;
    created_at?: string;
    updated_at?: string;
  }
  
  // Tipo para a resposta da API - Item único
  export interface ApiResponseSingleItem {
    success: boolean;
    message: string;
    data?: IntegracaoItem[];
  }
  
  // Tipo para a resposta da API - Upload em massa
  export interface ApiResponseBulkUpload {
    success: boolean;
    message: string;
    count?: number;
  }
  
  // Tipo para erros de validação
  export interface ValidationError {
    field: string;
    message: string;
  }
  
  // Schema Zod para validação (se você estiver usando Zod)
  // import { z } from 'zod';
  // 
  // export const integracaoItemSchema = z.object({
  //   endereco: z.string().min(1, "Endereço é obrigatório"),
  //   codigo: z.string().min(1, "Código é obrigatório"),
  //   descricao: z.string().min(1, "Descrição é obrigatória"),
  //   um: z.string().min(1, "UM é obrigatória"),
  // });