import { supabase } from '../integrations/supabase/client';

export interface HealthCheckResult {
  success: boolean;
  error?: string;
  details?: unknown;
  timestamp: string;
}

export class SupabaseHealthChecker {
  private static instance: SupabaseHealthChecker;
  private lastCheck: HealthCheckResult | null = null;
  private checkInterval: number = 30000; // 30 segundos

  static getInstance(): SupabaseHealthChecker {
    if (!SupabaseHealthChecker.instance) {
      SupabaseHealthChecker.instance = new SupabaseHealthChecker();
    }
    return SupabaseHealthChecker.instance;
  }

  async checkConnection(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();
    
    try {
      console.log('🔍 Verificando conectividade do Supabase...');
      
      // Teste básico de conectividade
      const { data, error } = await supabase
        .from('cars')
        .select('count')
        .limit(1);
      
      if (error) {
        console.error('❌ Erro na verificação de conectividade:', error);
        this.lastCheck = {
          success: false,
          error: error.message,
          details: error,
          timestamp
        };
        return this.lastCheck;
      }
      
      console.log('✅ Conectividade do Supabase OK');
      this.lastCheck = {
        success: true,
        timestamp
      };
      return this.lastCheck;
    } catch (error: unknown) {
      console.error('❌ Erro crítico na verificação de conectividade:', error);
      this.lastCheck = {
        success: false,
        error: (error as Error).message || 'Erro desconhecido',
        details: error,
        timestamp
      };
      return this.lastCheck;
    }
  }

  async checkTablePermissions(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();
    
    try {
      console.log('🔍 Verificando permissões das tabelas...');
      
      // Testar acesso às tabelas principais
      const tables = ['cars', 'conductors', 'reservations'];
      const results = [];
      
      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1);
          
          if (error) {
            console.warn(`⚠️ Erro ao acessar tabela ${table}:`, error);
            results.push({ table, success: false, error: error.message });
          } else {
            console.log(`✅ Acesso à tabela ${table} OK`);
            results.push({ table, success: true });
          }
        } catch (error: unknown) {
          console.error(`❌ Erro crítico ao acessar tabela ${table}:`, error);
          results.push({ table, success: false, error: (error as Error).message });
        }
      }
      
      const allSuccess = results.every(r => r.success);
      
      return {
        success: allSuccess,
        details: results,
        timestamp,
        error: allSuccess ? undefined : 'Algumas tabelas não estão acessíveis'
      };
    } catch (error: unknown) {
      console.error('❌ Erro crítico na verificação de permissões:', error);
      return {
        success: false,
        error: (error as Error).message || 'Erro desconhecido',
        details: error,
        timestamp
      };
    }
  }

  async performFullHealthCheck(): Promise<{
    connection: HealthCheckResult;
    permissions: HealthCheckResult;
    overall: boolean;
  }> {
    console.log('🏥 Iniciando verificação completa de saúde do Supabase...');
    
    const connection = await this.checkConnection();
    const permissions = await this.checkTablePermissions();
    
    const overall = connection.success && permissions.success;
    
    console.log(`🏥 Verificação completa finalizada. Status geral: ${overall ? '✅ OK' : '❌ FALHA'}`);
    
    return {
      connection,
      permissions,
      overall
    };
  }

  getLastCheck(): HealthCheckResult | null {
    return this.lastCheck;
  }

  startPeriodicCheck(): void {
    console.log('🔄 Iniciando verificação periódica de saúde do Supabase...');
    
    setInterval(async () => {
      await this.checkConnection();
    }, this.checkInterval);
  }
}

// Instância singleton
export const supabaseHealth = SupabaseHealthChecker.getInstance();

// Função utilitária para verificação rápida
export const quickHealthCheck = async (): Promise<boolean> => {
  const result = await supabaseHealth.checkConnection();
  return result.success;
};

// Função para logs detalhados de erro
export const logSupabaseError = (operation: string, error: Error | unknown): void => {
  console.group(`❌ Erro Supabase - ${operation}`);
  
  if (error && typeof error === 'object' && 'message' in error) {
    console.error('Mensagem:', (error as Error).message);
  }
  
  if (error && typeof error === 'object' && 'code' in error) {
    console.error('Código:', (error as { code: string }).code);
  }
  
  if (error && typeof error === 'object' && 'details' in error) {
    console.error('Detalhes:', (error as { details: string }).details);
  }
  
  if (error && typeof error === 'object' && 'hint' in error) {
    console.error('Hint:', (error as { hint: string }).hint);
  }
  
  if (error && typeof error === 'object' && 'stack' in error) {
    console.error('Stack:', (error as Error).stack);
  }
  
  console.groupEnd();
};