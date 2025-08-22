import { supabase } from "@/integrations/supabase/client";
import { sendReservationConfirmationEmail } from '@/services/emailService';
import type { ReservationConfirmationData } from '@/lib/email-templates';

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
export async function hasPendingKm(conductorName: string): Promise<boolean> {
  try {
    const isoToday = todayISO();
    const { data, error } = await supabase
      .from('reservations')
      .select('id')
      .eq('driver_name', conductorName)
      .lt('return_date', isoToday)
      .is('end_km', null);
    
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
export async function getPendingReservations(conductorName: string) {
  try {
    const isoToday = todayISO();
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('driver_name', conductorName)
      .lt('return_date', isoToday)
      .is('end_km', null)
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
      .update({ end_km: endKm })
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

// Interface para reserva
interface ReservationData {
  id: string;
  driver_name: string;
  conductor_email?: string;
  pickup_date: string;
  return_date: string;
  car: string;
  destinations?: string[];
  companions?: string[];
}

// Enviar email de confirmação de reserva
export async function sendReservationConfirmation(reservation: ReservationData) {
  try {
    if (!reservation.conductor_email) {
      console.log('No conductor email, skipping confirmation');
      return { success: false, error: 'No email provided' };
    }

    // Buscar informações do carro
    const { data: carData } = await supabase
      .from('cars')
      .select('model')
      .eq('plate', reservation.car)
      .single();

    // Preparar dados para o template de confirmação
    const confirmationData: ReservationConfirmationData = {
      conductorName: reservation.driver_name,
      conductorEmail: reservation.conductor_email,
      reservationId: reservation.id,
      carModel: carData?.model || 'Volkswagen T-Cross',
      carPlate: reservation.car,
      startDate: formatDateBR(reservation.pickup_date),
      endDate: formatDateBR(reservation.return_date),
      destination: (reservation.destinations || []).join(', ') || 'Não informado',
      companions: reservation.companions || []
    };

    // Enviar email de confirmação usando o novo serviço
    const result = await sendReservationConfirmationEmail(confirmationData);

    if (!result.success) {
      console.error('Error sending confirmation email:', result.error);
      return result;
    }

    // Atualizar timestamp de envio do email
    await supabase
      .from('reservations')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', reservation.id);

    return { success: true };
  } catch (error) {
    console.error('Error in sendReservationConfirmation:', error);
    return { success: false, error };
  }
}