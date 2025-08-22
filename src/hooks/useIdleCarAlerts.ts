import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Car {
  id: string;
  model: string;
  plate: string;
  last_used_date: string | null;
  status: string;
}

interface IdleCarAlert {
  carId: string;
  carModel: string;
  carPlate: string;
  lastUsedDate: string | null;
  daysSinceLastUse: number;
  severity: 'critical' | 'warning' | 'info';
  type: 'idle';
  message: string;
}

export function useIdleCarAlerts() {
  const [alerts, setAlerts] = useState<IdleCarAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const checkIdleCarAlerts = async () => {
    try {
      setLoading(true);
      
      const { data: cars, error } = await supabase
        .from('cars')
        .select('id, model, plate, last_used_date, status')
        .eq('status', 'disponível');

      if (error) {
        console.error('Erro ao buscar carros:', error);
        return;
      }

      const newAlerts: IdleCarAlert[] = [];
      const now = new Date();

      cars?.forEach((car: Car) => {
        if (!car.last_used_date) {
          // Carro nunca foi usado - alerta informativo
          newAlerts.push({
            carId: car.id,
            carModel: car.model,
            carPlate: car.plate,
            lastUsedDate: null,
            daysSinceLastUse: 0,
            severity: 'info',
            type: 'idle',
            message: 'Carro nunca foi utilizado'
          });
          return;
        }

        const lastUsedDate = new Date(car.last_used_date);
        const daysSinceLastUse = Math.floor(
          (now.getTime() - lastUsedDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Alertas baseados no tempo sem uso
        if (daysSinceLastUse >= 30) {
          newAlerts.push({
            carId: car.id,
            carModel: car.model,
            carPlate: car.plate,
            lastUsedDate: car.last_used_date,
            daysSinceLastUse,
            severity: 'critical',
            type: 'idle',
            message: `🚨 Parado há ${daysSinceLastUse} dias - Verificação mecânica necessária`
          });
        } else if (daysSinceLastUse >= 14) {
          newAlerts.push({
            carId: car.id,
            carModel: car.model,
            carPlate: car.plate,
            lastUsedDate: car.last_used_date,
            daysSinceLastUse,
            severity: 'warning',
            type: 'idle',
            message: `⚠️ Parado há ${daysSinceLastUse} dias - Considere agendar uso`
          });
        } else if (daysSinceLastUse >= 7) {
          newAlerts.push({
            carId: car.id,
            carModel: car.model,
            carPlate: car.plate,
            lastUsedDate: car.last_used_date,
            daysSinceLastUse,
            severity: 'info',
            type: 'idle',
            message: `ℹ️ Parado há ${daysSinceLastUse} dias`
          });
        }
      });

      setAlerts(newAlerts);
      
      // Exibir toasts apenas para alertas críticos (30+ dias)
      newAlerts.forEach(alert => {
        if (alert.severity === 'critical') {
          toast({
            title: '🚨 CARRO PARADO HÁ MUITO TEMPO',
            description: `${alert.carModel} (${alert.carPlate}): ${alert.message}`,
            variant: 'destructive',
          });
        }
      });

    } catch (error) {
      console.error('Erro ao verificar alertas de carros parados:', error);
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

  const getInfoAlertsCount = () => {
    return alerts.filter(alert => alert.severity === 'info').length;
  };

  useEffect(() => {
    checkIdleCarAlerts();
    
    // Verificar alertas a cada 30 minutos (menos frequente que manutenção)
    const interval = setInterval(checkIdleCarAlerts, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    alerts,
    loading,
    checkIdleCarAlerts,
    dismissAlert,
    getCriticalAlertsCount,
    getWarningAlertsCount,
    getInfoAlertsCount
  };
}