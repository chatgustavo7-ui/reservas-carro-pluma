import { 
  getEmailTemplate, 
  getEmailSubject, 
  getReservationConfirmationTemplate,
  type EmailTemplateType,
  type ReservationConfirmationData,
  type KmReminderData,
  type RevisionAlertData,
  type MaintenanceAlertData,
  type OverdueTripReminderData
} from '@/lib/email-templates';

// Configuração do Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://mnvasniimrvvvlbzvtmn.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1udmFzbmlpbXJ2dnZsYnp2dG1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3OTg3MTIsImV4cCI6MjA3MTM3NDcxMn0.a2czjdPTmvR5JROq8-jDKoHYyMKgKZ1K-CNcuqiTHgc';
const FROM_EMAIL = import.meta.env.FROM_EMAIL || 'plumareservas@gmail.com';
const REPLY_TO_EMAIL = import.meta.env.REPLY_TO_EMAIL || 'plumareservas@gmail.com';

// URL da Edge Function
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/send-email-sendgrid`;

// Configurações de e-mail
const EMAIL_CONFIG = {
  from: `Sistema de Reservas <${FROM_EMAIL}>`,
  replyTo: REPLY_TO_EMAIL,
  companyName: 'Grupo Pluma',
  systemName: 'Sistema de Reservas de Carros'
};

// Interface para dados de e-mail
interface EmailData {
  to: string | string[];
  subject: string;
  html: string;
}

// Função principal para envio de e-mails usando Edge Function do Supabase
export async function sendEmail(data: EmailData): Promise<{ success: boolean; error?: string }> {
  try {
    // Preparar dados para a Edge Function
    const recipients = Array.isArray(data.to) ? data.to[0] : data.to;
    
    const payload = {
      to: recipients,
      subject: data.subject,
      html: data.html,
      from: FROM_EMAIL,
      replyTo: REPLY_TO_EMAIL
    };

    console.log('Enviando e-mail via Edge Function:', { 
      to: recipients, 
      subject: data.subject,
      from: FROM_EMAIL 
    });

    // Enviar e-mail usando Edge Function do Supabase
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Edge Function error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Erro desconhecido na Edge Function');
    }

    console.log('E-mail enviado com sucesso via Edge Function');
    
    return { success: true };
  } catch (error: unknown) {
    console.error('Erro na função sendEmail via Edge Function:', error);
    
    let errorMessage = 'Erro desconhecido';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    return { success: false, error: errorMessage };
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
      // Aguardar antes de tentar novamente (backoff exponencial)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  return { success: false, error: `Falha após ${maxRetries} tentativas: ${lastError}` };
}

// Função para enviar e-mail de confirmação de reserva
export async function sendReservationConfirmationEmail(
  data: ReservationConfirmationData
): Promise<{ success: boolean; error?: string }> {
  const html = getEmailTemplate('reservation_confirmation', data);
  const subject = getEmailSubject('reservation_confirmation', data);
  
  // Enviar apenas para o condutor principal
  const recipient = data.conductorEmail;
  
  console.log('Enviando confirmação de reserva para:', recipient);
  
  return sendEmailWithRetry({
    to: recipient,
    subject,
    html
  });
}

// Função para enviar lembrete de quilometragem
export async function sendKmReminderEmail(
  data: KmReminderData
): Promise<{ success: boolean; error?: string }> {
  const html = getEmailTemplate('km_reminder', data);
  const subject = getEmailSubject('km_reminder', data);
  
  return sendEmailWithRetry({
    to: data.conductorEmail,
    subject,
    html
  });
}

// Função para enviar alerta de revisão
export async function sendRevisionAlertEmail(
  data: RevisionAlertData
): Promise<{ success: boolean; error?: string }> {
  const html = getEmailTemplate('revision_alert', data);
  const subject = getEmailSubject('revision_alert', data);
  
  return sendEmailWithRetry({
    to: data.adminEmail,
    subject,
    html
  });
}

// Função para enviar alerta de manutenção
export async function sendMaintenanceAlertEmail(
  data: MaintenanceAlertData
): Promise<{ success: boolean; error?: string }> {
  const html = getEmailTemplate('maintenance_alert', data);
  const subject = getEmailSubject('maintenance_alert', data);
  
  // Enviar apenas para o admin
  const recipient = data.adminEmail;
  
  return sendEmailWithRetry({
    to: recipient,
    subject,
    html
  });
}

// Função para enviar lembrete de viagem em atraso
export async function sendOverdueTripReminderEmail(
  data: OverdueTripReminderData
): Promise<{ success: boolean; error?: string }> {
  const html = getEmailTemplate('overdue_trip_reminder', data);
  const subject = getEmailSubject('overdue_trip_reminder', data);
  
  return sendEmailWithRetry({
    to: data.conductorEmail,
    subject,
    html
  });
}

// Função para enviar e-mail genérico com template
export async function sendTemplatedEmail(
  type: EmailTemplateType,
  data: ReservationConfirmationData | KmReminderData | RevisionAlertData | MaintenanceAlertData | OverdueTripReminderData,
  recipients: string | string[]
): Promise<{ success: boolean; error?: string }> {
  const html = getEmailTemplate(type, data);
  const subject = getEmailSubject(type, data);
  
  return sendEmailWithRetry({
    to: recipients,
    subject,
    html
  });
}