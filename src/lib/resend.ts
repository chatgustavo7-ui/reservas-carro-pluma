import { Resend } from 'resend';

// Configuração do Resend
const resend = new Resend(import.meta.env.RESEND_API_KEY);

// Configurações de e-mail
export const EMAIL_CONFIG = {
  from: import.meta.env.FROM_EMAIL || 'onboarding@resend.dev',
  adminEmail: import.meta.env.ADMIN_EMAIL || 'admin@grupopluma.com.br',
  companyName: 'Grupo Pluma',
  systemName: 'Sistema de Reservas de Carros'
};

// Tipos de e-mail
export enum EmailType {
  RESERVATION_CONFIRMATION = 'reservation_confirmation',
  KM_REMINDER = 'km_reminder',
  MAINTENANCE_ALERT = 'maintenance_alert',
  REVISION_ALERT = 'revision_alert'
}

// Interface para dados de e-mail
export interface EmailData {
  to: string[];
  subject: string;
  html: string;
  type: EmailType;
}

// Função principal para envio de e-mails
export async function sendEmail(data: EmailData): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: data.to,
      subject: data.subject,
      html: data.html
    });

    if (result.error) {
      console.error('Erro ao enviar e-mail:', result.error);
      return { success: false, error: result.error.message };
    }

    console.log('E-mail enviado com sucesso:', result.data?.id);
    return { success: true };
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}

// Função com retry para maior confiabilidade
export async function sendEmailWithRetry(
  data: EmailData, 
  maxRetries: number = 3
): Promise<{ success: boolean; error?: string }> {
  let lastError: string = '';
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await sendEmail(data);
    
    if (result.success) {
      return result;
    }
    
    lastError = result.error || 'Erro desconhecido';
    
    if (attempt < maxRetries) {
      // Aguarda antes de tentar novamente (backoff exponencial)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  return { success: false, error: `Falha após ${maxRetries} tentativas: ${lastError}` };
}

export default resend;