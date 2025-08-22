import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { Resend } from "npm:resend@2.0.0";

// Template de e-mail de alerta de revisão
function getRevisionAlertTemplate(data: {
  carModel: string;
  carPlate: string;
  currentKm: number;
  nextRevisionKm: number;
  kmUntilRevision: number;
  adminEmail: string;
}): string {
  const urgencyLevel = data.kmUntilRevision <= 0 ? 'urgent' : data.kmUntilRevision <= 500 ? 'warning' : 'info';
  const urgencyColor = urgencyLevel === 'urgent' ? '#dc3545' : urgencyLevel === 'warning' ? '#ffc107' : '#17a2b8';
  const urgencyText = urgencyLevel === 'urgent' ? 'URGENTE - REVISÃO VENCIDA' : urgencyLevel === 'warning' ? 'ATENÇÃO - REVISÃO PRÓXIMA' : 'INFORMAÇÃO - REVISÃO SE APROXIMANDO';

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Alerta de Revisão</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background-color: white; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 300;">🔧 Alerta de Revisão</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">Sistema de Reservas - Grupo Pluma</p>
        </div>

        <!-- Alert Banner -->
        <div style="background-color: ${urgencyColor}; color: white; padding: 15px; text-align: center;">
          <strong style="font-size: 18px;">⚠️ ${urgencyText}</strong>
        </div>

        <!-- Content -->
        <div style="padding: 30px 20px;">
          <h2 style="color: #333; margin-top: 0; font-size: 24px;">Veículo Necessita Revisão 🚗</h2>
          
          <!-- Vehicle Info -->
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${urgencyColor};">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
              <h3 style="margin: 0; color: #333; font-size: 20px;">${data.carModel}</h3>
              <span style="background-color: ${urgencyColor}; color: white; padding: 6px 12px; border-radius: 20px; font-weight: bold;">
                ${data.carPlate}
              </span>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
              <div style="text-align: center; padding: 15px; background-color: white; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: bold; color: #333;">${data.currentKm.toLocaleString()}</div>
                <div style="color: #666; font-size: 14px;">Quilometragem Atual</div>
              </div>
              <div style="text-align: center; padding: 15px; background-color: white; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: bold; color: ${urgencyColor};">${Math.abs(data.kmUntilRevision).toLocaleString()}</div>
                <div style="color: #666; font-size: 14px;">${data.kmUntilRevision <= 0 ? 'KM em atraso' : 'KM até revisão'}</div>
              </div>
            </div>
          </div>

          <!-- Action Required -->
          ${data.kmUntilRevision <= 0 ? `
            <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #721c24; font-size: 18px;">🚨 Ação Imediata Necessária</h3>
              <p style="color: #721c24; margin-bottom: 0;">
                Este veículo está com a revisão vencida em <strong>${Math.abs(data.kmUntilRevision).toLocaleString()} km</strong>. 
                Recomendamos suspender o uso até a realização da manutenção.
              </p>
            </div>
          ` : data.kmUntilRevision <= 500 ? `
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #856404; font-size: 18px;">⚠️ Revisão Próxima</h3>
              <p style="color: #856404; margin-bottom: 0;">
                Este veículo precisa de revisão em breve. Recomendamos agendar a manutenção o mais breve possível.
              </p>
            </div>
          ` : `
            <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #0c5460; font-size: 18px;">📅 Planejamento de Manutenção</h3>
              <p style="color: #0c5460; margin-bottom: 0;">
                Mantenha-se atento à quilometragem para planejar a próxima revisão.
              </p>
            </div>
          `}

          <!-- Important Notes -->
          <div style="background-color: #e9ecef; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #495057; font-size: 16px;">📋 Lembretes Importantes:</h4>
            <ul style="margin: 10px 0; padding-left: 20px; color: #495057;">
              <li>Revisões devem ser feitas a cada 10.000 km</li>
              <li>O veículo fica indisponível durante a manutenção</li>
              <li>Atualize o sistema após a conclusão da revisão</li>
              <li>Verifique se há reservas que podem ser afetadas</li>
            </ul>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
          <p style="margin: 0; color: #6c757d; font-size: 14px;">
            🔧 Alerta automático do Sistema de Reservas<br>
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
const adminEmail = Deno.env.get("ADMIN_EMAIL") || "admin@belloreservas.com";

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Iniciando verificação de alertas de manutenção...");

    // Buscar carros que precisam de revisão
    const { data: cars, error: carsError } = await supabase
      .from('cars')
      .select('id, model, plate, current_km, next_maintenance_km, status')
      .neq('status', 'maintenance');

    if (carsError) {
      console.error('Erro ao buscar carros:', carsError);
      throw carsError;
    }

    console.log(`Verificando ${cars?.length || 0} carros...`);

    let alertsSent = 0;

    for (const car of cars || []) {
      const kmUntilRevision = car.next_maintenance_km - car.current_km;
      
      // Enviar alerta se:
      // - Revisão vencida (kmUntilRevision <= 0)
      // - Revisão próxima (kmUntilRevision <= 500)
      // - Revisão se aproximando (kmUntilRevision <= 1000) - apenas uma vez por semana
      
      let shouldSendAlert = false;
      let alertType = '';
      
      if (kmUntilRevision <= 0) {
        shouldSendAlert = true;
        alertType = 'urgent';
      } else if (kmUntilRevision <= 500) {
        shouldSendAlert = true;
        alertType = 'warning';
      } else if (kmUntilRevision <= 1000) {
        // Para alertas informativos, verificar se já foi enviado esta semana
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const { data: recentAlert } = await supabase
          .from('maintenance_alerts_log')
          .select('sent_at')
          .eq('car_id', car.id)
          .eq('alert_type', 'info')
          .gte('sent_at', oneWeekAgo.toISOString())
          .single();
        
        if (!recentAlert) {
          shouldSendAlert = true;
          alertType = 'info';
        }
      }
      
      if (shouldSendAlert) {
        console.log(`Enviando alerta de revisão para ${car.model} (${car.plate}) - Tipo: ${alertType}`);
        
        const revisionData = {
          carModel: car.model,
          carPlate: car.plate,
          currentKm: car.current_km,
          nextRevisionKm: car.next_maintenance_km,
          kmUntilRevision,
          adminEmail
        };
        
        const html = getRevisionAlertTemplate(revisionData);
        const subject = kmUntilRevision <= 0 
          ? `🚨 URGENTE: Revisão Vencida - ${car.model} (${car.plate})`
          : kmUntilRevision <= 500
          ? `⚠️ Revisão Próxima - ${car.model} (${car.plate})`
          : `📅 Revisão se Aproximando - ${car.model} (${car.plate})`;
        
        try {
          const { error: emailError } = await resend.emails.send({
            from: 'Sistema de Reservas <noreply@belloreservas.com>',
            to: adminEmail,
            subject,
            html
          });
          
          if (emailError) {
            console.error(`Erro ao enviar alerta para ${car.plate}:`, emailError);
          } else {
            console.log(`Alerta de revisão enviado para ${car.plate}`);
            alertsSent++;
            
            // Registrar o envio do alerta
            await supabase
              .from('maintenance_alerts_log')
              .insert({
                car_id: car.id,
                alert_type: alertType,
                km_at_alert: car.current_km,
                km_until_maintenance: kmUntilRevision,
                sent_at: new Date().toISOString()
              });
          }
        } catch (error) {
          console.error(`Erro ao enviar alerta para ${car.plate}:`, error);
        }
      }
    }

    console.log(`Verificação concluída. ${alertsSent} alertas enviados.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${alertsSent} alertas de manutenção enviados`,
        alertsSent 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: unknown) {
    console.error("Erro na função send-maintenance-alerts:", error);
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