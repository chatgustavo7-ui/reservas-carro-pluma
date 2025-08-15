import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
          } catch (error) {
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
    }, {} as Record<string, { email: string; reservations: any[] }>);

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

        // Montar lista das reservas pendentes
        const reservationsList = driverData.reservations
          .map(r => `
            <li style="margin-bottom: 8px;">
              <strong>Placa:</strong> ${r.car}<br>
              <strong>Período:</strong> ${formatDateBR(r.pickup_date)} até ${formatDateBR(r.return_date)}<br>
              <strong>Destinos:</strong> ${(r.destinations || []).join(', ')}<br>
            </li>
          `)
          .join('');

        const html = `
          <h2>Pendência de KM - Regularize suas reservas</h2>
          <p>Olá <strong>${driverName}</strong>,</p>
          <p>Você possui <strong>${driverData.reservations.length}</strong> reserva(s) com KM pendente de devolução:</p>
          <ul style="list-style-type: none; padding: 0;">
            ${reservationsList}
          </ul>
          <p>Para regularizar, acesse o sistema e informe o KM da devolução.</p>
          <p style="margin-top: 20px;">
            <a href="${supabaseUrl.replace('supabase.co', 'lovable.app')}" 
               style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Informar KM agora
            </a>
          </p>
          <hr>
          <p style="font-size: 12px; color: #666;">
            Este é um lembrete automático do sistema de reservas.
          </p>
        `;

        // Enviar email
        const emailResponse = await supabase.functions.invoke('send-email', {
          body: {
            to: driverData.email,
            subject: 'Pendência de KM — Regularize suas reservas',
            html
          }
        });

        if (emailResponse.error) {
          console.error(`Error sending email to ${driverName}:`, emailResponse.error);
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

  } catch (error: any) {
    console.error("Error in send-daily-reminders function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);