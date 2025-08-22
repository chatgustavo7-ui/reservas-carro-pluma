// Export all email templates
export { getReservationConfirmationTemplate, type ReservationConfirmationData } from './reservation-confirmation';
export { getKmReminderTemplate, type KmReminderData } from './km-reminder';
export { getRevisionAlertTemplate, type RevisionAlertData } from './revision-alert';
export { getMaintenanceAlertTemplate, type MaintenanceAlertData } from './maintenance-alert';
export { getOverdueTripReminderTemplate, type OverdueTripReminderData } from './overdue-trip-reminder';

// Import functions and types for internal use
import { getReservationConfirmationTemplate, type ReservationConfirmationData } from './reservation-confirmation';
import { getKmReminderTemplate, type KmReminderData } from './km-reminder';
import { getRevisionAlertTemplate, type RevisionAlertData } from './revision-alert';
import { getMaintenanceAlertTemplate, type MaintenanceAlertData } from './maintenance-alert';
import { getOverdueTripReminderTemplate, type OverdueTripReminderData } from './overdue-trip-reminder';

// Email template types
export type EmailTemplateType = 
  | 'reservation_confirmation'
  | 'km_reminder'
  | 'revision_alert'
  | 'maintenance_alert'
  | 'overdue_trip_reminder';

// Generic email template data
export type EmailTemplateData = 
  | ReservationConfirmationData
  | KmReminderData
  | RevisionAlertData
  | MaintenanceAlertData
  | OverdueTripReminderData;

// Template factory function
export function getEmailTemplate(
  type: EmailTemplateType,
  data: EmailTemplateData
): string {
  switch (type) {
    case 'reservation_confirmation':
      return getReservationConfirmationTemplate(data as ReservationConfirmationData);
    case 'km_reminder':
      return getKmReminderTemplate(data as KmReminderData);
    case 'revision_alert':
      return getRevisionAlertTemplate(data as RevisionAlertData);
    case 'maintenance_alert':
      return getMaintenanceAlertTemplate(data as MaintenanceAlertData);
    case 'overdue_trip_reminder':
      return getOverdueTripReminderTemplate(data as OverdueTripReminderData);
    default:
      throw new Error(`Template type '${type}' not found`);
  }
}

// Email subject generator
export function getEmailSubject(type: EmailTemplateType, data: EmailTemplateData): string {
  switch (type) {
    case 'reservation_confirmation':
      return `✅ Reserva Confirmada - ${data.carModel} (${data.startDate})`;
    case 'km_reminder': {
      const kmData = data as KmReminderData;
      const action = kmData.isPickup ? 'Retirada' : 'Devolução';
      return `📋 Quilometragem Pendente - ${action} ${kmData.carModel}`;
    }
    case 'revision_alert': {
      const revisionData = data as RevisionAlertData;
      return `🔧 Alerta de Revisão - ${revisionData.carModel} (${revisionData.kmUntilRevision}km restantes)`;
    }
    case 'maintenance_alert': {
      const maintenanceData = data as MaintenanceAlertData;
      return `⚠️ Manutenção Programada - ${maintenanceData.carModel}`;
    }
    case 'overdue_trip_reminder': {
      const overdueData = data as OverdueTripReminderData;
      const urgencyText = overdueData.daysOverdue >= 7 ? 'CRÍTICO' : overdueData.daysOverdue >= 3 ? 'URGENTE' : 'ATENÇÃO';
      return `🚨 ${urgencyText} - Viagem Não Finalizada - ${overdueData.carModel} (${overdueData.daysOverdue} dias)`;
    }
    default:
      return 'Notificação do Sistema de Reservas';
  }
}