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

/**
 * Formata um objeto Date para exibição DD/MM/YYYY
 */
export function formatDateObjectForDisplay(date: Date): string {
  if (!date) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formata uma data ISO string para exibição DD/MM/YYYY
 */
export function formatISODateForDisplay(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return formatDateObjectForDisplay(date);
}

/**
 * Formata uma data com horário para exibição DD/MM/YYYY HH:mm
 */
export function formatDateTimeForDisplay(date: Date | string): string {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Formata uma data para exibição relativa (hoje, ontem, etc.) em português
 */
export function formatRelativeDateForDisplay(date: Date | string): string {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const isToday = dateObj.toDateString() === today.toDateString();
  const isYesterday = dateObj.toDateString() === yesterday.toDateString();
  
  if (isToday) return 'Hoje';
  if (isYesterday) return 'Ontem';
  
  return formatDateObjectForDisplay(dateObj);
}

/**
 * Formata uma string de data para exibição DD/MM/YYYY
 * Aceita tanto formato YYYY-MM-DD quanto ISO string
 */
export function formatDateStringForDisplay(dateString: string): string {
  if (!dateString) return '';
  
  // Se for uma ISO string completa, converter para Date primeiro
  if (dateString.includes('T')) {
    const date = new Date(dateString);
    return formatDateObjectForDisplay(date);
  }
  
  // Se for formato YYYY-MM-DD
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}