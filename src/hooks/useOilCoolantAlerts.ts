import { useState, useEffect } from 'react';

export interface MaintenanceAlert {
  car_id: string;
  plate: string;
  model: string;
  brand: string;
  current_km: number;
  maintenance_type_id: string;
  maintenance_type: string;
  category: 'oil' | 'coolant';
  km_interval: number;
  time_interval_months: number;
  last_maintenance_date: string | null;
  last_maintenance_km: number | null;
  next_due_km: number | null;
  next_due_date: string | null;
  km_until_due: number;
  calculated_next_due_date: string;
  km_status: 'OK_KM' | 'PROXIMO_KM' | 'URGENTE_KM' | 'VENCIDO_KM';
  time_status: 'OK_TEMPO' | 'PROXIMO_TEMPO' | 'URGENTE_TEMPO' | 'VENCIDO_TEMPO';
  overall_status: 'OK' | 'PROXIMO' | 'URGENTE' | 'VENCIDO';
}

export interface MaintenanceType {
  id: string;
  name: string;
  description: string;
  category: string;
  default_km_interval: number;
  default_time_interval_months: number;
  min_km_interval: number;
  max_km_interval: number;
  min_time_interval_months: number;
  max_time_interval_months: number;
  is_active: boolean;
}

export interface VehicleMaintenanceConfig {
  id: string;
  car_id: string;
  maintenance_type_id: string;
  km_interval: number;
  time_interval_months: number;
  is_enabled: boolean;
}

export interface MaintenanceHistory {
  id: string;
  car_id: string;
  maintenance_type_id: string;
  maintenance_date: string;
  km_at_maintenance: number;
  next_due_km: number;
  next_due_date: string;
  description?: string;
  cost?: number;
  performed_by?: string;
  notes?: string;
  created_at: string;
}

export const useOilCoolantAlerts = () => {
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [maintenanceTypes, setMaintenanceTypes] = useState<MaintenanceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar alertas de manutenção - MOCK
  const fetchMaintenanceAlerts = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    const mockData: MaintenanceAlert[] = [
      {
        car_id: '1',
        plate: 'ABC-1234',
        model: 'Fiat Argo',
        brand: 'Fiat',
        current_km: 15500,
        maintenance_type_id: 'oil-1',
        maintenance_type: 'Troca de Óleo',
        category: 'oil',
        km_interval: 10000,
        time_interval_months: 12,
        last_maintenance_date: '2024-06-01',
        last_maintenance_km: 10000,
        next_due_km: 20000,
        next_due_date: '2025-06-01',
        km_until_due: 4500,
        calculated_next_due_date: '2025-06-01',
        km_status: 'OK_KM',
        time_status: 'OK_TEMPO',
        overall_status: 'OK'
      },
      {
        car_id: '2',
        plate: 'DEF-5678',
        model: 'Chevrolet Onix',
        brand: 'Chevrolet',
        current_km: 31000,
        maintenance_type_id: 'oil-2',
        maintenance_type: 'Troca de Óleo',
        category: 'oil',
        km_interval: 10000,
        time_interval_months: 12,
        last_maintenance_date: '2024-01-15',
        last_maintenance_km: 21000,
        next_due_km: 31000,
        next_due_date: '2025-01-15',
        km_until_due: 0,
        calculated_next_due_date: '2025-01-15',
        km_status: 'URGENTE_KM',
        time_status: 'OK_TEMPO',
        overall_status: 'URGENTE'
      }
    ];
    setAlerts(mockData);
    setLoading(false);
  };

  // Buscar tipos de manutenção - MOCK
  const fetchMaintenanceTypes = async () => {
    const mockTypes: MaintenanceType[] = [
      {
        id: 'oil-1',
        name: 'Troca de Óleo',
        description: 'Troca de óleo do motor',
        category: 'oil',
        default_km_interval: 10000,
        default_time_interval_months: 12,
        min_km_interval: 5000,
        max_km_interval: 15000,
        min_time_interval_months: 6,
        max_time_interval_months: 24,
        is_active: true
      },
      {
        id: 'coolant-1',
        name: 'Troca de Líquido de Arrefecimento',
        description: 'Troca do líquido de arrefecimento',
        category: 'coolant',
        default_km_interval: 40000,
        default_time_interval_months: 24,
        min_km_interval: 30000,
        max_km_interval: 60000,
        min_time_interval_months: 18,
        max_time_interval_months: 36,
        is_active: true
      }
    ];
    setMaintenanceTypes(mockTypes);
  };

  // Buscar configuração de manutenção de um veículo - MOCK
  const getVehicleMaintenanceConfig = async (carId: string): Promise<VehicleMaintenanceConfig[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [];
  };

  // Atualizar configuração de manutenção - MOCK
  const updateMaintenanceConfig = async (
    carId: string,
    maintenanceTypeId: string,
    kmInterval: number,
    timeIntervalMonths: number,
    isEnabled: boolean = true
  ) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    await fetchMaintenanceAlerts();
    return true;
  };

  // Registrar manutenção realizada - MOCK
  const registerMaintenance = async (
    carId: string,
    maintenanceTypeId: string,
    maintenanceDate: string,
    kmAtMaintenance: number,
    description?: string,
    cost?: number,
    performedBy?: string,
    notes?: string
  ) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    await fetchMaintenanceAlerts();
    return { success: true };
  };

  // Buscar histórico de manutenção - MOCK
  const getMaintenanceHistory = async (carId?: string, maintenanceTypeId?: string): Promise<MaintenanceHistory[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [];
  };

  // Filtrar alertas por status
  const getAlertsByStatus = (status: string) => {
    return alerts.filter(alert => alert.overall_status === status);
  };

  // Filtrar alertas por categoria
  const getAlertsByCategory = (category: 'oil' | 'coolant') => {
    return alerts.filter(alert => alert.category === category);
  };

  // Contar alertas por status
  const getAlertCounts = () => {
    return {
      vencido: alerts.filter(a => a.overall_status === 'VENCIDO').length,
      urgente: alerts.filter(a => a.overall_status === 'URGENTE').length,
      proximo: alerts.filter(a => a.overall_status === 'PROXIMO').length,
      ok: alerts.filter(a => a.overall_status === 'OK').length,
      total: alerts.length
    };
  };

  // Obter próximas manutenções (próximos 30 dias)
  const getUpcomingMaintenance = () => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    return alerts.filter(alert => {
      if (!alert.calculated_next_due_date) return false;
      const dueDate = new Date(alert.calculated_next_due_date);
      return dueDate <= thirtyDaysFromNow && alert.overall_status !== 'VENCIDO';
    });
  };

  useEffect(() => {
    fetchMaintenanceAlerts();
    fetchMaintenanceTypes();
  }, []);

  return {
    alerts,
    maintenanceTypes,
    loading,
    error,
    fetchMaintenanceAlerts,
    fetchMaintenanceTypes,
    getVehicleMaintenanceConfig,
    updateMaintenanceConfig,
    registerMaintenance,
    getMaintenanceHistory,
    getAlertsByStatus,
    getAlertsByCategory,
    getAlertCounts,
    getUpcomingMaintenance
  };
};

export default useOilCoolantAlerts;