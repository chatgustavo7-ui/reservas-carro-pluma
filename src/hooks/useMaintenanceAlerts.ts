import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Car {
  id: string;
  model: string;
  plate: string;
  current_km: number;
  next_maintenance_km: number;
  next_revision_km: number;
  status: string;
  km_to_revision: number;
  needs_urgent_maintenance: boolean;
  maintenance_status: string;
  maintenance_alert: string;
}

interface MaintenanceAlert {
  carId: string;
  carModel: string;
  carPlate: string;
  currentKm: number;
  nextMaintenanceKm: number;
  nextRevisionKm: number;
  kmUntilMaintenance: number;
  kmUntilRevision: number;
  severity: 'critical' | 'warning' | 'info';
  type: 'maintenance' | 'revision';
  message: string;
}

export function useMaintenanceAlerts() {
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const checkMaintenanceAlerts = async () => {
    try {
      setLoading(true);
      
      const { data: cars, error } = await supabase
        .from('cars_maintenance_status')
        .select('id, model, plate, current_km, next_maintenance_km, next_revision_km, status, km_to_revision, needs_urgent_maintenance, maintenance_status, maintenance_alert')
        .neq('status', 'manutenção');

      if (error) {
        console.error('Erro ao buscar carros:', error);
        return;
      }

      const newAlerts: MaintenanceAlert[] = [];

      cars?.forEach((car: Car) => {
        const kmUntilMaintenance = car.next_maintenance_km - car.current_km;
        const kmUntilRevision = car.km_to_revision;
        
        // Verificar alertas de REVISÃO (baseado em quilometragem com margem)
        if (car.maintenance_status === 'REVISÃO_VENCIDA') {
          newAlerts.push({
            carId: car.id,
            carModel: car.model,
            carPlate: car.plate,
            currentKm: car.current_km,
            nextMaintenanceKm: car.next_maintenance_km,
            nextRevisionKm: car.next_revision_km,
            kmUntilMaintenance,
            kmUntilRevision,
            severity: 'critical',
            type: 'revision',
            message: `🔴 REVISÃO VENCIDA! Veículo bloqueado - ${Math.abs(kmUntilRevision).toLocaleString()} km além da margem`
          });
        } else if (car.maintenance_status === 'REVISÃO_VENCIDA_MARGEM') {
          newAlerts.push({
            carId: car.id,
            carModel: car.model,
            carPlate: car.plate,
            currentKm: car.current_km,
            nextMaintenanceKm: car.next_maintenance_km,
            nextRevisionKm: car.next_revision_km,
            kmUntilMaintenance,
            kmUntilRevision,
            severity: 'warning',
            type: 'revision',
            message: `🟠 ATENÇÃO! Usando margem de segurança - ${Math.abs(kmUntilRevision).toLocaleString()} km após revisão`
          });
        } else if (car.maintenance_status === 'REVISÃO_PRÓXIMA') {
          newAlerts.push({
            carId: car.id,
            carModel: car.model,
            carPlate: car.plate,
            currentKm: car.current_km,
            nextMaintenanceKm: car.next_maintenance_km,
            nextRevisionKm: car.next_revision_km,
            kmUntilMaintenance,
            kmUntilRevision,
            severity: 'warning',
            type: 'revision',
            message: `🟡 Revisão próxima em ${kmUntilRevision.toLocaleString()} km`
          });
        } else if (car.maintenance_status === 'REVISÃO_APROXIMANDO') {
          newAlerts.push({
            carId: car.id,
            carModel: car.model,
            carPlate: car.plate,
            currentKm: car.current_km,
            nextMaintenanceKm: car.next_maintenance_km,
            nextRevisionKm: car.next_revision_km,
            kmUntilMaintenance,
            kmUntilRevision,
            severity: 'info',
            type: 'revision',
            message: `ℹ️ Revisão se aproximando em ${kmUntilRevision.toLocaleString()} km`
          });
        }

        // Verificar alertas de MANUTENÇÃO (baseado em outros critérios)
        if (kmUntilMaintenance <= 0 && car.next_maintenance_km !== car.next_revision_km) {
          newAlerts.push({
            carId: car.id,
            carModel: car.model,
            carPlate: car.plate,
            currentKm: car.current_km,
            nextMaintenanceKm: car.next_maintenance_km,
            nextRevisionKm: car.next_revision_km,
            kmUntilMaintenance,
            kmUntilRevision,
            severity: 'critical',
            type: 'maintenance',
            message: `Manutenção VENCIDA! ${Math.abs(kmUntilMaintenance).toLocaleString()} km em atraso`
          });
        } else if (kmUntilMaintenance <= 500 && car.next_maintenance_km !== car.next_revision_km) {
          newAlerts.push({
            carId: car.id,
            carModel: car.model,
            carPlate: car.plate,
            currentKm: car.current_km,
            nextMaintenanceKm: car.next_maintenance_km,
            nextRevisionKm: car.next_revision_km,
            kmUntilMaintenance,
            kmUntilRevision,
            severity: 'warning',
            type: 'maintenance',
            message: `Manutenção em ${kmUntilMaintenance.toLocaleString()} km`
          });
        }
      });

      setAlerts(newAlerts);
      
      // Exibir toasts para alertas críticos e urgentes
      newAlerts.forEach(alert => {
        if (alert.severity === 'critical') {
          const icon = alert.type === 'revision' ? '🔧' : '⚠️';
          const title = alert.type === 'revision' ? 'REVISÃO NECESSÁRIA' : 'MANUTENÇÃO VENCIDA';
          
          toast({
            title: `${icon} ${title}`,
            description: `${alert.carModel} (${alert.carPlate}): ${alert.message}`,
            variant: 'destructive',
          });
        } else if (alert.severity === 'warning' && alert.type === 'revision') {
          // Toast especial para revisões próximas
          toast({
            title: '🔧 REVISÃO PRÓXIMA',
            description: `${alert.carModel} (${alert.carPlate}): ${alert.message}`,
            variant: 'default',
          });
        }
      });

    } catch (error) {
      console.error('Erro ao verificar alertas de manutenção:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissAlert = (carId: string) => {
    setAlerts(prev => prev.filter(alert => alert.carId !== carId));
  };

  const getCriticalAlertsCount = () => {
    return alerts.filter(alert => alert.severity === 'critical').length;
  };

  const getWarningAlertsCount = () => {
    return alerts.filter(alert => alert.severity === 'warning').length;
  };

  useEffect(() => {
    checkMaintenanceAlerts();
    
    // Verificar alertas a cada 5 minutos
    const interval = setInterval(checkMaintenanceAlerts, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    alerts,
    loading,
    checkMaintenanceAlerts,
    dismissAlert,
    getCriticalAlertsCount,
    getWarningAlertsCount
  };
}