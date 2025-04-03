import { createClient } from '@supabase/supabase-js';

// Cria uma instância do cliente Supabase com variáveis de ambiente
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cliente para uso no lado do cliente
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Função para obter um cliente do Supabase no lado do servidor
export const getServerSupabaseClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceRoleKey);
};

// Definição da interface para o item
export interface IntegracaoItem {
  id?: string;
  endereco: string;
  codigo: string;
  descricao: string;
  um: string;
  created_at?: string;
  updated_at?: string;
}