import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { startOfDay } from 'date-fns';

const TIMEZONE = 'America/Sao_Paulo';

/**
 * Normaliza uma data para meio-dia no timezone local (São Paulo)
 * para evitar problemas de comparação com timezones
 */
export function normalizeToLocalNoon(date: Date): Date {
  const zonedDate = toZonedTime(date, TIMEZONE);
  zonedDate.setHours(12, 0, 0, 0);
  return zonedDate;
}

/**
 * Converte uma data para string YYYY-MM-DD no timezone local
 */
export function formatToLocalDateString(date: Date): string {
  return formatInTimeZone(date, TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Obtém a data de hoje no timezone local, normalizada para meio-dia
 */
export function getTodayLocal(): Date {
  const today = toZonedTime(new Date(), TIMEZONE);
  today.setHours(12, 0, 0, 0);
  return today;
}

/**
 * Compara se uma data é maior ou igual a hoje (timezone local)
 */
export function isDateFromToday(date: Date): boolean {
  const today = startOfDay(toZonedTime(new Date(), TIMEZONE));
  const compareDate = startOfDay(toZonedTime(date, TIMEZONE));
  return compareDate >= today;
}

/**
 * Converte string YYYY-MM-DD para Date normalizada
 */
export function parseLocalDateString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  return date;
}

/**
 * Converte Date para string YYYY-MM-DD sem problemas de timezone
 */
export function dateToLocalString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formata uma string YYYY-MM-DD para exibição DD/MM/YYYY
 */
export function formatDateForDisplay(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}