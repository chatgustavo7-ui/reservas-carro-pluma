import { supabase } from "@/integrations/supabase/client";

// Função para obter data atual no fuso America/Sao_Paulo
export function todayISO(): string {
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Verificar se um condutor tem pendências de KM
export async function hasPendingKm(driverName: string): Promise<boolean> {
  try {
    const isoToday = todayISO();
    const { data, error } = await supabase
      .from('reservations')
      .select('id')
      .eq('driver_name', driverName)
      .lt('return_date', isoToday)
      .is('odometer_end_km', null);
    
    if (error) {
      console.error('Error checking pending KM:', error);
      return false; // fallback: não travar a UI se der erro
    }
    
    return (data?.length ?? 0) > 0;
  } catch (error) {
    console.error('Error in hasPendingKm:', error);
    return false;
  }
}

// Buscar reservas pendentes de um condutor
export async function getPendingReservations(driverName: string) {
  try {
    const isoToday = todayISO();
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('driver_name', driverName)
      .lt('return_date', isoToday)
      .is('odometer_end_km', null)
      .order('return_date', { ascending: false });
    
    if (error) {
      console.error('Error fetching pending reservations:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getPendingReservations:', error);
    return [];
  }
}

// Salvar KM de devolução
export async function saveEndKm(reservationId: string, endKm: number) {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .update({ odometer_end_km: endKm })
      .eq('id', reservationId)
      .select()
      .single();
    
    return { data, error };
  } catch (error) {
    console.error('Error in saveEndKm:', error);
    return { data: null, error };
  }
}

// Formatar data de YYYY-MM-DD para DD/MM/AAAA
export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

// Enviar email de confirmação de reserva
export async function sendReservationConfirmation(reservation: any) {
  try {
    if (!reservation.driver_email) {
      console.log('No driver email, skipping confirmation');
      return { success: false, error: 'No email provided' };
    }

    const html = `
      <h2>Reserva Confirmada</h2>
      <p>Olá <strong>${reservation.driver_name}</strong>,</p>
      <p>Sua reserva <strong>#${reservation.id}</strong> foi confirmada com sucesso.</p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Período:</strong> ${formatDateBR(reservation.pickup_date)} até ${formatDateBR(reservation.return_date)}</p>
        <p><strong>Placa:</strong> ${reservation.car}</p>
        <p><strong>Destinos:</strong> ${(reservation.destinations || []).join(', ')}</p>
        ${reservation.companions?.length > 0 ? `<p><strong>Acompanhantes:</strong> ${reservation.companions.join(', ')}</p>` : ''}
      </div>
      
      <p><strong>Importante:</strong> Quando devolver o veículo, lembre-se de informar o KM no sistema.</p>
      
      <hr style="margin: 20px 0;">
      <p style="font-size: 12px; color: #666;">
        Este é um email automático do sistema de reservas.
      </p>
    `;

    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: reservation.driver_email,
        subject: 'Reserva confirmada',
        html
      }
    });

    if (error) {
      console.error('Error sending confirmation email:', error);
      return { success: false, error };
    }

    // Atualizar timestamp de envio do email
    await supabase
      .from('reservations')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', reservation.id);

    return { success: true, data };
  } catch (error) {
    console.error('Error in sendReservationConfirmation:', error);
    return { success: false, error };
  }
}