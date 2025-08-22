import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { Resend } from "npm:resend@2.0.0";

// Interface para dados de lembrete de viagem em atraso
interface OverdueTripReminderData {
  conductorName: string;
  conductorEmail: string;
  carModel: string;
  carPlate: string;
  reservationId: string;
  returnDate: string;
  daysOverdue: number;
  reminderCount: number;
  systemUrl?: string;
}

// Template de e-mail para viagem em atraso
function getOverdueTripReminderTemplate(data: OverdueTripReminderData): string {
  const urgencyLevel = data.daysOverdue >= 7 ? 'critical' : data.daysOverdue >= 3 ? 'urgent' : 'warning';
  const urgencyColor = urgencyLevel === 'critical' ? '#dc2626' : urgencyLevel === 'urgent' ? '#f59e0b' : '#3b82f6';
  const urgencyText = urgencyLevel === 'critical' ? 'CRÍTICO' : urgencyLevel === 'urgent' ? 'URGENTE' : 'ATENÇÃO';
  const reminderText = data.reminderCount > 1 ? `(${data.reminderCount}º lembrete)` : '';

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Viagem Não Finalizada - Grupo Pluma</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background-color: white;
          border-radius: 10px;
          padding: 0;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, ${urgencyColor} 0%, ${urgencyLevel === 'critical' ? '#991b1b' : urgencyLevel === 'urgent' ? '#d97706' : '#1e40af'} 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .urgency-badge {
          display: inline-block;
          background-color: rgba(255, 255, 255, 0.2);
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 10px;
          border: 2px solid rgba(255, 255, 255, 0.3);
        }
        .title {
          font-size: 24px;
          margin: 0;
          font-weight: 300;
        }
        .content {
          padding: 30px 20px;
        }
        .alert-banner {
          background-color: ${urgencyColor};
          color: white;
          padding: 15px;
          text-align: center;
          font-weight: bold;
          font-size: 16px;
        }
        .info-section {
          background-color: #f8fafc;
          border-left: 4px solid ${urgencyColor};
          padding: 20px;
          margin: 20px 0;
          border-radius: 0 8px 8px 0;
        }
        .info-row {
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .info-label {
          font-weight: bold;
          color: #374151;
          min-width: 120px;
        }
        .info-value {
          color: #1f2937;
          text-align: right;
        }
        .action-required {
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
          border: 2px solid ${urgencyColor};
          border-radius: 12px;
          padding: 25px;
          margin: 25px 0;
          text-align: center;
        }
        .action-title {
          color: ${urgencyColor};
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 15px;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, ${urgencyColor} 0%, ${urgencyLevel === 'critical' ? '#991b1b' : urgencyLevel === 'urgent' ? '#d97706' : '#1e40af'} 100%);
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 25px;
          font-weight: bold;
          margin: 15px 0;
          font-size: 16px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
        }
        .warning-box {
          background-color: #fef3c7;
          border: 2px solid #f59e0b;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .critical-warning {
          background-color: #fee2e2;
          border: 2px solid #dc2626;
          color: #991b1b;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 20px;
          text-align: center;
          border-top: 1px solid #dee2e6;
          color: #6c757d;
          font-size: 14px;
        }
        .pulse {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🚗 Grupo Pluma</div>
          <div class="urgency-badge ${urgencyLevel === 'critical' ? 'pulse' : ''}">
            ${urgencyText} ${reminderText}
          </div>
          <div class="title">Viagem Não Finalizada</div>
        </div>
        
        <div class="alert-banner ${urgencyLevel === 'critical' ? 'pulse' : ''}">
          ⚠️ Viagem em atraso há ${data.daysOverdue} dia(s) - Ação necessária
        </div>
        
        <div class="content">
          <h2 style="color: #333; margin-top: 0; font-size: 24px;">Olá, ${data.conductorName}! 👋</h2>
          
          <p style="font-size: 16px; margin-bottom: 25px; color: #555;">
            Sua viagem com o veículo <strong>${data.carModel}</strong> ainda não foi finalizada no sistema. 
            A data de devolução prevista era <strong>${data.returnDate}</strong> e já se passaram 
            <strong style="color: ${urgencyColor};">${data.daysOverdue} dia(s)</strong>.
          </p>
          
          <div class="info-section">
            <div class="info-row">
              <span class="info-label">🚗 Veículo:</span>
              <span class="info-value">${data.carModel}</span>
            </div>
            <div class="info-row">
              <span class="info-label">🏷️ Placa:</span>
              <span class="info-value">${data.carPlate}</span>
            </div>
            <div class="info-row">
              <span class="info-label">📋 Reserva:</span>
              <span class="info-value">#${data.reservationId}</span>
            </div>
            <div class="info-row">
              <span class="info-label">📅 Data de Devolução:</span>
              <span class="info-value">${data.returnDate}</span>
            </div>
            <div class="info-row">
              <span class="info-label">⏰ Dias em Atraso:</span>
              <span class="info-value" style="color: ${urgencyColor}; font-weight: bold;">${data.daysOverdue} dia(s)</span>
            </div>
          </div>
          
          <div class="action-required">
            <div class="action-title">📝 Finalização Obrigatória</div>
            <p style="margin-bottom: 20px; color: #555; font-size: 16px;">
              Para finalizar sua viagem, você precisa informar a <strong>quilometragem final</strong> do veículo no sistema.
            </p>
            ${data.systemUrl ? `
              <a href="${data.systemUrl}" class="button">
                🚗 Finalizar Viagem Agora
              </a>
            ` : ''}
          </div>
          
          ${data.daysOverdue >= 3 ? `
            <div class="warning-box ${data.daysOverdue >= 7 ? 'critical-warning' : ''}">
              <h4 style="margin-top: 0; color: ${data.daysOverdue >= 7 ? '#991b1b' : '#92400e'}; font-size: 16px;">
                ${data.daysOverdue >= 7 ? '🚨 Situação Crítica' : '⚠️ Atenção Especial'}
              </h4>
              <p style="margin-bottom: 0; color: ${data.daysOverdue >= 7 ? '#991b1b' : '#92400e'};">
                ${data.daysOverdue >= 7 
                  ? 'Esta viagem está em atraso há mais de uma semana. A finalização é obrigatória e urgente para o controle da frota.' 
                  : 'A informação da quilometragem é obrigatória para o funcionamento do sistema de reservas.'}
              </p>
            </div>
          ` : ''}
          
          <div style="background-color: #e0f2fe; border-left: 4px solid #0288d1; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <h4 style="margin-top: 0; color: #01579b; font-size: 16px;">💡 Como Finalizar:</h4>
            <ol style="margin: 10px 0; padding-left: 20px; color: #01579b;">
              <li>Acesse o sistema de reservas</li>
              <li>Localize sua reserva ativa</li>
              <li>Clique em "Informar KM de Devolução"</li>
              <li>Digite a quilometragem atual do veículo</li>
              <li>Confirme a finalização</li>
            </ol>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 25px;">
            Em caso de dúvidas ou problemas técnicos, entre em contato com a administração imediatamente.
          </p>
        </div>
        
        <div class="footer">
          <p style="margin: 0;"><strong>Grupo Pluma</strong><br>
          Sistema Automatizado de Reservas de Carros</p>
          <p style="margin: 10px 0 0 0; color: #adb5bd; font-size: 12px;">
            Este é um lembrete automático enviado ${data.reminderCount > 1 ? `pela ${data.reminderCount}ª vez` : 'pela primeira vez'}.<br>
            Enviado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Função para formatar data de YYYY-MM-DD para DD/MM/AAAA
function formatDateBR(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

// Função para obter data atual no fuso America/Sao_Paulo
function todayISO(): string {
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Função para verificar se deve enviar email (3x por dia: 8h, 14h, 20h)
function shouldSendEmailNow(): boolean {
  const now = new Date();
  const brasiliaOffset = -3; // UTC-3
  const brasiliaHour = (now.getUTCHours() + brasiliaOffset + 24) % 24;
  
  // Enviar às 8h, 14h e 20h (horário de Brasília)
  return brasiliaHour === 8 || brasiliaHour === 14 || brasiliaHour === 20;
}

// Função para verificar se é horário de finalização automática (18h)
function isAutoFinalizationTime(): boolean {
  const now = new Date();
  const brasiliaOffset = -3; // UTC-3
  const brasiliaHour = (now.getUTCHours() + brasiliaOffset + 24) % 24;
  return brasiliaHour === 18;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const today = todayISO();
    console.log(`Running automated trip management for date: ${today}`);

    let emailsSent = 0;
    let tripsFinalized = 0;

    // 1. FINALIZAÇÃO AUTOMÁTICA (às 18h) - Reservas que deveriam ter sido devolvidas hoje
    if (isAutoFinalizationTime()) {
      console.log("Running auto-finalization for today's overdue trips...");
      
      const { data: overdueReservations, error: overdueError } = await supabase
        .rpc('auto_complete_overdue_reservations');

      if (overdueError) {
        console.error('Error running auto-finalization:', overdueError);
      } else {
        tripsFinalized = overdueReservations || 0;
        console.log(`Auto-finalized ${tripsFinalized} overdue trips`);
      }
    }

    // 2. ENVIO DE LEMBRETES (3x por dia: 8h, 14h, 20h)
    if (shouldSendEmailNow()) {
      console.log("Running email reminders for overdue trips...");
      
      // Buscar reservas em atraso usando a função do Supabase
      const { data: overdueReservations, error: reservationsError } = await supabase
        .rpc('get_overdue_reservations');

      if (reservationsError) {
        console.error('Error fetching overdue reservations:', reservationsError);
        return new Response(JSON.stringify({ error: reservationsError.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      if (!overdueReservations || overdueReservations.length === 0) {
        console.log('No overdue reservations found');
      } else {
        console.log(`Found ${overdueReservations.length} overdue reservations`);

        // Processar cada reserva em atraso
        for (const reservation of overdueReservations) {
          try {
            // Verificar se deve enviar email (controle de frequência)
            const { data: shouldSend, error: shouldSendError } = await supabase
              .rpc('should_send_email', { 
                reservation_id: reservation.id 
              });

            if (shouldSendError) {
              console.error(`Error checking email frequency for reservation ${reservation.id}:`, shouldSendError);
              continue;
            }

            if (!shouldSend) {
              console.log(`Email already sent recently for reservation ${reservation.id}`);
              continue;
            }

            // Buscar dados do condutor
            const { data: conductorData, error: conductorError } = await supabase
              .from('conductors')
              .select('name, email')
              .eq('id', reservation.conductor_id)
              .single();

            if (conductorError || !conductorData?.email) {
              console.error(`Error fetching conductor data for reservation ${reservation.id}:`, conductorError);
              continue;
            }

            // Buscar dados do carro
            const { data: carData, error: carError } = await supabase
              .from('cars')
              .select('model')
              .eq('plate', reservation.car)
              .single();

            if (carError) {
              console.error(`Error fetching car data for reservation ${reservation.id}:`, carError);
              continue;
            }

            // Calcular dias em atraso
            const returnDate = new Date(reservation.end_date);
            const todayDate = new Date(today);
            const daysOverdue = Math.floor((todayDate.getTime() - returnDate.getTime()) / (1000 * 60 * 60 * 24));

            // Contar quantos lembretes já foram enviados
            const { data: emailCount, error: countError } = await supabase
              .from('automation_logs')
              .select('id')
              .eq('reservation_id', reservation.id)
              .eq('action_type', 'email_sent');

            const reminderCount = (emailCount?.length || 0) + 1;

            // Preparar dados do template
            const emailData: OverdueTripReminderData = {
              conductorName: conductorData.name,
              conductorEmail: conductorData.email,
              carModel: carData?.model || 'Veículo',
              carPlate: reservation.car,
              reservationId: reservation.id.toString(),
              returnDate: formatDateBR(reservation.end_date),
              daysOverdue,
              reminderCount,
              systemUrl: supabaseUrl.replace('.supabase.co', '.lovable.app')
            };

            // Gerar template HTML
            const html = getOverdueTripReminderTemplate(emailData);
            
            // Gerar assunto do e-mail
            const urgencyText = daysOverdue >= 7 ? 'CRÍTICO' : daysOverdue >= 3 ? 'URGENTE' : 'ATENÇÃO';
            const subject = `🚨 ${urgencyText} - Viagem Não Finalizada - ${emailData.carModel} (${daysOverdue} dias)`;

            // Enviar email usando Resend
            const { error: emailError } = await resend.emails.send({
              from: 'Sistema de Reservas <noreply@belloreservas.com>',
              to: conductorData.email,
              subject,
              html
            });

            if (emailError) {
              console.error(`Error sending email to ${conductorData.email}:`, emailError);
              continue;
            }

            // Registrar o envio do email
            const { error: logError } = await supabase
              .rpc('log_email_sent', {
                reservation_id: reservation.id,
                conductor_email: conductorData.email,
                email_type: 'overdue_trip_reminder'
              });

            if (logError) {
              console.error(`Error logging email for reservation ${reservation.id}:`, logError);
            }

            emailsSent++;
            console.log(`Overdue trip reminder sent to ${conductorData.name} (${conductorData.email}) for reservation ${reservation.id}`);

          } catch (error) {
            console.error(`Error processing overdue reservation ${reservation.id}:`, error);
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      message: `Automated trip management completed successfully`,
      emailsSent,
      tripsFinalized,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: unknown) {
    console.error("Error in automated-trip-management function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);