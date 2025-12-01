import { useState, useEffect } from 'react';

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

// Dados mockados para demonstração
const mockAlerts: IdleCarAlert[] = [
  {
    carId: '3',
    carModel: 'Volkswagen Gol',
    carPlate: 'GHI-9012',
    lastUsedDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    daysSinceLastUse: 35,
    severity: 'critical',
    type: 'idle',
    message: '🚨 Parado há 35 dias - Verificação mecânica necessária'
  },
  {
    carId: '4',
    carModel: 'Hyundai HB20',
    carPlate: 'JKL-3456',
    lastUsedDate: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(),
    daysSinceLastUse: 16,
    severity: 'warning',
    type: 'idle',
    message: '⚠️ Parado há 16 dias - Considere agendar uso'
  },
  {
    carId: '5',
    carModel: 'Renault Sandero',
    carPlate: 'MNO-7890',
    lastUsedDate: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    daysSinceLastUse: 9,
    severity: 'info',
    type: 'idle',
    message: 'ℹ️ Parado há 9 dias'
  }
];

export function useIdleCarAlerts() {
  const [alerts, setAlerts] = useState<IdleCarAlert[]>([]);
  const [loading, setLoading] = useState(false);

  const checkIdleCarAlerts = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setAlerts(mockAlerts);
    setLoading(false);
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
