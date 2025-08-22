import { PostgrestResponse } from '@supabase/supabase-js';
import { logSupabaseError } from './supabaseHealth';

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: Error | unknown) => boolean;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryCondition: (error: Error | unknown) => {
    // Retry em erros de rede, timeout, ou erros temporários
    if (error && typeof error === 'object' && 'name' in error && (error as Error).name === 'TypeError' && 'message' in error && (error as Error).message?.includes('fetch')) return true;
    if (error && typeof error === 'object' && 'name' in error && (error as Error).name === 'AbortError') return true;
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'PGRST301') return true; // Row Level Security
     if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'PGRST116') return true; // Connection error
    if (error && typeof error === 'object' && 'message' in error && (error as Error).message?.includes('network')) return true;
    if (error && typeof error === 'object' && 'message' in error && (error as Error).message?.includes('timeout')) return true;
    return false;
  }
};

class RetryableError extends Error {
  constructor(message: string, public originalError: Error | unknown) {
    super(message);
    this.name = 'RetryableError';
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const exponentialDelay = options.baseDelay * Math.pow(options.backoffMultiplier, attempt - 1);
  return Math.min(exponentialDelay, options.maxDelay);
}

export async function retrySupabaseQuery<T>(
  queryFn: () => Promise<PostgrestResponse<T>>,
  options: RetryOptions = {}
): Promise<PostgrestResponse<T>> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    try {
      console.log(`[RetryUtils] Executando query - tentativa ${attempt}/${opts.maxRetries}`);
      
      const result = await queryFn();
      
      if (result.error) {
        if (opts.retryCondition(result.error) && attempt < opts.maxRetries) {
          console.warn(`[RetryUtils] Erro retryable na tentativa ${attempt}:`, result.error);
          lastError = result.error;
          const delayMs = calculateDelay(attempt, opts);
          console.log(`[RetryUtils] Aguardando ${delayMs}ms antes da próxima tentativa`);
          await delay(delayMs);
          continue;
        } else {
          // Erro não retryable ou última tentativa
          logSupabaseError(`Query failed after ${attempt} attempts`, result.error);
          return result;
        }
      }
      
      if (attempt > 1) {
        console.log(`[RetryUtils] ✅ Query bem-sucedida na tentativa ${attempt}`);
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      if (opts.retryCondition(error) && attempt < opts.maxRetries) {
        console.warn(`[RetryUtils] Erro de rede na tentativa ${attempt}:`, error);
        const delayMs = calculateDelay(attempt, opts);
        console.log(`[RetryUtils] Aguardando ${delayMs}ms antes da próxima tentativa`);
        await delay(delayMs);
        continue;
      } else {
        // Erro não retryable ou última tentativa
        logSupabaseError(`Query failed with network error after ${attempt} attempts`, error);
        throw new RetryableError(`Query failed after ${attempt} attempts`, error);
      }
    }
  }
  
  throw new RetryableError(`Query failed after ${opts.maxRetries} attempts`, lastError);
}

export async function retrySupabaseOperation<T>(
  operationFn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    try {
      console.log(`[RetryUtils] Executando operação - tentativa ${attempt}/${opts.maxRetries}`);
      
      const result = await operationFn();
      
      if (attempt > 1) {
        console.log(`[RetryUtils] ✅ Operação bem-sucedida na tentativa ${attempt}`);
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      if (opts.retryCondition(error) && attempt < opts.maxRetries) {
        console.warn(`[RetryUtils] Erro na tentativa ${attempt}:`, error);
        const delayMs = calculateDelay(attempt, opts);
        console.log(`[RetryUtils] Aguardando ${delayMs}ms antes da próxima tentativa`);
        await delay(delayMs);
        continue;
      } else {
        // Erro não retryable ou última tentativa
        logSupabaseError(`Operation failed after ${attempt} attempts`, error);
        throw new RetryableError(`Operation failed after ${attempt} attempts`, error);
      }
    }
  }
  
  throw new RetryableError(`Operation failed after ${opts.maxRetries} attempts`, lastError);
}

// Função helper para queries simples
export const withRetry = {
  select: <T>(queryFn: () => Promise<PostgrestResponse<T>>, options?: RetryOptions) => 
    retrySupabaseQuery(queryFn, options),
  
  insert: <T>(queryFn: () => Promise<PostgrestResponse<T>>, options?: RetryOptions) => 
    retrySupabaseQuery(queryFn, options),
  
  update: <T>(queryFn: () => Promise<PostgrestResponse<T>>, options?: RetryOptions) => 
    retrySupabaseQuery(queryFn, options),
  
  delete: <T>(queryFn: () => Promise<PostgrestResponse<T>>, options?: RetryOptions) => 
    retrySupabaseQuery(queryFn, options),
  
  operation: <T>(operationFn: () => Promise<T>, options?: RetryOptions) => 
    retrySupabaseOperation(operationFn, options)
};