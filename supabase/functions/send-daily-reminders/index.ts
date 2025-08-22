import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { Resend } from "npm:resend@2.0.0";

// Template de e-mail de lembrete de KM
function getKmReminderTemplate(data: {
  conductorName: string;
  conductorEmail: string;
  carModel: string;
  carPlate: string;
  reservationId: string;
  isPickup: boolean;
  daysLate: number;
  pendingReservations: Array<{
    id: string;
    carPlate: string;
    startDate: string;
    endDate: string;
    destinations: string[];
  }>;
  systemUrl: string;
}): string {
  const urgencyLevel = data.daysLate >= 7 ? 'urgent' : data.daysLate >= 3 ? 'warning' : 'info';
  const urgencyColor = urgencyLevel === 'urgent' ? '#dc3545' : urgencyLevel === 'warning' ? '#ffc107' : '#17a2b8';
  const urgencyText = urgencyLevel === 'urgent' ? 'URGENTE' : urgencyLevel === 'warning' ? 'ATENÇÃO' : 'INFORMAÇÃO';

  const reservationsList = data.pendingReservations
    .map(r => `
      <div style="background-color: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid ${urgencyColor};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="color: #333; font-size: 16px;">${r.carPlate}</strong>
          <span style="background-color: ${urgencyColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
            ID: ${r.id}
          </span>
        </div>
        <div style="color: #666; font-size: 14px; line-height: 1.4;">
          <div><strong>Período:</strong> ${r.startDate} até ${r.endDate}</div>
          ${r.destinations.length > 0 ? `<div><strong>Destinos:</strong> ${r.destinations.join(', ')}</div>` : ''}
        </div>
      </div>
    `)
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Lembrete de Quilometragem</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background-color: white; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 300;">📋 Lembrete de Quilometragem</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">Sistema de Reservas - Grupo Pluma</p>
        </div>

        <!-- Alert Banner -->
        <div style="background-color: ${urgencyColor}; color: white; padding: 15px; text-align: center;">
          <strong style="font-size: 18px;">⚠️ ${urgencyText} - ${data.daysLate} dia(s) em atraso</strong>
        </div>

        <!-- Content -->
        <div style="padding: 30px 20px;">
          <h2 style="color: #333; margin-top: 0; font-size: 24px;">Olá, ${data.conductorName}! 👋</h2>
          
          <p style="font-size: 16px; margin-bottom: 25px; color: #555;">
            Você possui <strong style="color: ${urgencyColor};">${data.pendingReservations.length}</strong> reserva(s) com quilometragem pendente de devolução:
          </p>

          <!-- Reservations List -->
          <div style="margin: 25px 0;">
            ${reservationsList}
          </div>

          <!-- Action Required -->
          <div style="background-color: #e9ecef; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${urgencyColor};">
            <h3 style="margin-top: 0; color: #333; font-size: 18px;">📝 Ação Necessária</h3>
            <p style="margin-bottom: 15px; color: #555;">
              Para regularizar sua situação, acesse o sistema e informe a quilometragem de devolução de cada veículo.
            </p>
            <div style="text-align: center; margin-top: 20px;">
              <a href="${data.systemUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: all 0.3s ease;">
                🚗 Informar Quilometragem Agora
              </a>
            </div>
          </div>

          <!-- Important Notes -->
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #856404; font-size: 16px;">⚠️ Lembretes Importantes:</h4>
            <ul style="margin: 10px 0; padding-left: 20px; color: #856404;">
              <li>A quilometragem deve ser informada até 24h após a devolução</li>
              <li>Atrasos podem impactar futuras reservas</li>
              <li>Em caso de dúvidas, entre em contato com a administração</li>
            </ul>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
          <p style="margin: 0; color: #6c757d; font-size: 14px;">
            📧 Este é um lembrete automático do Sistema de Reservas<br>
            <strong>Grupo Pluma</strong> - Gestão de Frota
          </p>
          <p style="margin: 10px 0 0 0; color: #adb5bd; font-size: 12px;">
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

// Função para verificar se é 18h (horário de Brasília)
function isAutoFinalizationTime(): boolean {
  const now = new Date();
  const brasiliaOffset = -3; // UTC-3
  const brasiliaHour = (now.getUTCHours() + brasiliaOffset + 24) % 24;
  return brasiliaHour >= 18;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const today = todayISO();
    console.log(`Running daily reminders and auto-finalization for date: ${today}`);

    // Finalização automática às 18h - reservas que deveriam ter sido devolvidas hoje
    if (isAutoFinalizationTime()) {
      console.log("Running auto-finalization for today's returns...");
      
      const { data: autoFinalizableReservations, error: autoError } = await supabase
        .from('reservations')
        .select('*')
        .eq('return_date', today)
        .eq('status', 'ativa')
        .is('odometer_end_km', null);

      if (autoError) {
        console.error('Error fetching auto-finalizable reservations:', autoError);
      } else if (autoFinalizableReservations?.length > 0) {
        console.log(`Found ${autoFinalizableReservations.length} reservations to auto-finalize`);
        
        for (const reservation of autoFinalizableReservations) {
          try {
            // Finalizar automaticamente (status = concluída, mas KM fica null = pendente)
            const { error: updateError } = await supabase
              .from('reservations')
              .update({ status: 'concluída' })
              .eq('id', reservation.id);

            if (updateError) {
              console.error(`Error auto-finalizing reservation ${reservation.id}:`, updateError);
            } else {
              console.log(`Auto-finalized reservation ${reservation.id} for ${reservation.driver_name}`);
            }
          } catch (error: unknown) {
            console.error(`Error processing auto-finalization for ${reservation.id}:`, error);
          }
        }
      }
    }

    // Buscar todos os condutores com pendências de KM
    const { data: pendingReservations, error: reservationsError } = await supabase
      .from('reservations')
      .select('driver_name, driver_email, car, pickup_date, return_date, destinations')
      .lt('return_date', today)
      .is('odometer_end_km', null)
      .not('driver_email', 'is', null);

    if (reservationsError) {
      console.error('Error fetching pending reservations:', reservationsError);
      return new Response(JSON.stringify({ error: reservationsError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!pendingReservations || pendingReservations.length === 0) {
      console.log('No pending reservations found');
      return new Response(JSON.stringify({ message: 'No pending reservations' }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Agrupar por condutor
    const driverGroups = pendingReservations.reduce((acc, reservation) => {
      const driverKey = reservation.driver_name;
      if (!acc[driverKey]) {
        acc[driverKey] = {
          email: reservation.driver_email,
          reservations: []
        };
      }
      acc[driverKey].reservations.push(reservation);
      return acc;
    }, {} as Record<string, { email: string; reservations: typeof pendingReservations }>);

    let emailsSent = 0;

    // Enviar email para cada condutor (verificando se já foi enviado hoje)
    for (const [driverName, driverData] of Object.entries(driverGroups)) {
      try {
        // Verificar se já foi enviado lembrete hoje para este condutor
        const { data: driverRecord } = await supabase
          .from('drivers')
          .select('km_reminder_last_sent_on')
          .eq('name', driverName)
          .maybeSingle();

        if (driverRecord?.km_reminder_last_sent_on === today) {
          console.log(`Reminder already sent today for driver: ${driverName}`);
          continue;
        }

        // Calcular dias em atraso para a reserva mais antiga
        const oldestReservation = driverData.reservations
          .sort((a, b) => new Date(a.return_date).getTime() - new Date(b.return_date).getTime())[0];
        
        const returnDate = new Date(oldestReservation.return_date);
        const todayDate = new Date(today);
        const daysLate = Math.floor((todayDate.getTime() - returnDate.getTime()) / (1000 * 60 * 60 * 24));

        // Buscar informações do carro
        const { data: carData } = await supabase
          .from('cars')
          .select('model')
          .eq('plate', oldestReservation.car)
          .single();

        // Preparar dados para o template de lembrete de KM
        const kmReminderData = {
          conductorName: driverName,
          conductorEmail: driverData.email,
          carModel: carData?.model || 'Volkswagen T-Cross',
          carPlate: oldestReservation.car,
          reservationId: oldestReservation.id || 'N/A',
          isPickup: false, // É sempre devolução nos lembretes
          daysLate,
          pendingReservations: driverData.reservations.map(r => ({
            id: r.id || 'N/A',
            carPlate: r.car,
            startDate: formatDateBR(r.pickup_date),
            endDate: formatDateBR(r.return_date),
            destinations: r.destinations || []
          })),
          systemUrl: supabaseUrl.replace('supabase.co', 'lovable.app')
        };

        // Gerar template HTML usando a função do template
        const html = getKmReminderTemplate(kmReminderData);
        
        // Gerar assunto do e-mail
        const subject = `📋 Quilometragem Pendente - Devolução ${carData?.model || 'T-Cross'}`;

        // Enviar email usando Resend
        try {
          const { error: emailError } = await resend.emails.send({
            from: 'Sistema de Reservas <noreply@belloreservas.com>',
            to: driverData.email,
            subject,
            html
          });

          if (emailError) {
            console.error(`Erro ao enviar email para ${driverData.email}:`, emailError);
            continue;
          } else {
            console.log(`Email de lembrete enviado para ${driverData.email}`);
          }
        } catch (error) {
          console.error(`Erro ao enviar email para ${driverData.email}:`, error);
          continue;
        }

        // Atualizar data do último envio
        await supabase
          .from('drivers')
          .upsert({
            name: driverName,
            email: driverData.email,
            km_reminder_last_sent_on: today
          });

        emailsSent++;
        console.log(`Reminder sent to ${driverName} (${driverData.email})`);

      } catch (error) {
        console.error(`Error processing driver ${driverName}:`, error);
      }
    }

    return new Response(JSON.stringify({ 
      message: `Daily reminders sent successfully`,
      emailsSent,
      totalPendingDrivers: Object.keys(driverGroups).length
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: unknown) {
    console.error("Error in send-daily-reminders function:", error);
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