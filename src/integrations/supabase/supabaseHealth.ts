import { supabase } from './client';

export class SupabaseHealthChecker {
  private static instance: SupabaseHealthChecker;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastHealthCheck: Date | null = null;
  private isHealthy: boolean = true;

  private constructor() {}

  static getInstance(): SupabaseHealthChecker {
    if (!SupabaseHealthChecker.instance) {
      SupabaseHealthChecker.instance = new SupabaseHealthChecker();
    }
    return SupabaseHealthChecker.instance;
  }

  async checkConnection(): Promise<boolean> {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 segundo
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[SupabaseHealth] Tentativa de conexão ${attempt}/${maxRetries}`);
        
        const { data, error } = await supabase.from('cars').select('count');
        
        if (error) {
          console.error(`[SupabaseHealth] Erro na tentativa ${attempt}:`, error);
          if (attempt === maxRetries) {
            this.logSupabaseError('Connection check failed after all retries', error);
            return false;
          }
          await this.delay(retryDelay * attempt); // Backoff exponencial
          continue;
        }
        
        console.log(`[SupabaseHealth] Conexão bem-sucedida na tentativa ${attempt}`);
        return true;
      } catch (error) {
        console.error(`[SupabaseHealth] Erro de rede na tentativa ${attempt}:`, error);
        if (attempt === maxRetries) {
          this.logSupabaseError('Connection check error after all retries', error);
          return false;
        }
        await this.delay(retryDelay * attempt);
      }
    }
    
    return false;
  }

  async checkTablePermissions(): Promise<{ cars: boolean; conductors: boolean; reservations: boolean }> {
    const results = { cars: false, conductors: false, reservations: false };
    const tables = ['cars', 'conductors', 'reservations'] as const;
    
    for (const table of tables) {
      try {
        console.log(`[SupabaseHealth] Verificando permissões da tabela ${table}`);
        
        const { data, error } = await this.retryOperation(
          () => supabase.from(table).select('count'),
          3,
          1000
        );
        
        if (error) {
          console.error(`[SupabaseHealth] Erro de permissão na tabela ${table}:`, error);
          this.logSupabaseError(`${table} table permission check failed`, error);
          results[table] = false;
        } else {
          console.log(`[SupabaseHealth] Permissões OK para tabela ${table}`);
          results[table] = true;
        }
      } catch (error) {
        console.error(`[SupabaseHealth] Erro de rede na tabela ${table}:`, error);
        this.logSupabaseError(`${table} table permission check error`, error);
        results[table] = false;
      }
    }
    
    return results;
  }

  async performFullHealthCheck(): Promise<{
    connection: boolean;
    permissions: { cars: boolean; conductors: boolean; reservations: boolean };
    timestamp: Date;
  }> {
    console.log('[SupabaseHealth] Iniciando verificação completa de saúde');
    
    const connection = await this.checkConnection();
    const permissions = await this.checkTablePermissions();
    const timestamp = new Date();
    
    this.lastHealthCheck = timestamp;
    this.isHealthy = connection && Object.values(permissions).every(Boolean);
    
    const result = { connection, permissions, timestamp };
    
    if (this.isHealthy) {
      console.log('[SupabaseHealth] ✅ Sistema saudável');
    } else {
      console.warn('[SupabaseHealth] ⚠️ Problemas detectados:', result);
    }
    
    return result;
  }

  startPeriodicCheck(intervalMs: number = 30000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    console.log(`[SupabaseHealth] Iniciando verificações periódicas a cada ${intervalMs}ms`);
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performFullHealthCheck();
      } catch (error) {
        console.error('[SupabaseHealth] Erro na verificação periódica:', error);
      }
    }, intervalMs);
    
    // Executa a primeira verificação imediatamente
    this.performFullHealthCheck();
  }

  stopPeriodicCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('[SupabaseHealth] Verificações periódicas interrompidas');
    }
  }

  getLastHealthCheck(): Date | null {
    return this.lastHealthCheck;
  }

  isSystemHealthy(): boolean {
    return this.isHealthy;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt === maxRetries) {
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1); // Backoff exponencial
        console.log(`[SupabaseHealth] Tentativa ${attempt} falhou, tentando novamente em ${delay}ms`);
        await this.delay(delay);
      }
    }
    
    throw lastError;
  }
  
  logSupabaseError(message: string, error: Error | unknown) {
    console.error(`[SupabaseHealth] ${message}:`, error);
    
    // Log detalhado do erro
    if (error?.message) {
      console.error(`[SupabaseHealth] Error message: ${error.message}`);
    }
    if (error?.details) {
      console.error(`[SupabaseHealth] Error details: ${error.details}`);
    }
    if (error?.hint) {
      console.error(`[SupabaseHealth] Error hint: ${error.hint}`);
    }
    if (error?.code) {
      console.error(`[SupabaseHealth] Error code: ${error.code}`);
    }
    
    // Log informações de rede se disponível
    if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
      console.error(`[SupabaseHealth] Possível problema de rede ou CORS`);
    }
    if (error?.name === 'AbortError') {
      console.error(`[SupabaseHealth] Requisição foi abortada`);
    }
  }
}

// Instância singleton
export const supabaseHealth = SupabaseHealthChecker.getInstance();

// Funções utilitárias para uso fácil
export const quickHealthCheck = async (): Promise<boolean> => {
  const checker = SupabaseHealthChecker.getInstance();
  return await checker.checkConnection();
};

export const logSupabaseError = (message: string, error: Error | unknown) => {
  const checker = SupabaseHealthChecker.getInstance();
  checker.logSupabaseError(message, error);
};