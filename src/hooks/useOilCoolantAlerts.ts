import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

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

  // Buscar alertas de manutenção
  const fetchMaintenanceAlerts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vehicle_maintenance_status')
        .select('*')
        .order('overall_status', { ascending: false })
        .order('plate');

      if (error) throw error;
      setAlerts(data || []);
    } catch (err) {
      console.error('Erro ao buscar alertas de manutenção:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Buscar tipos de manutenção
  const fetchMaintenanceTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_types')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('name');

      if (error) throw error;
      setMaintenanceTypes(data || []);
    } catch (err) {
      console.error('Erro ao buscar tipos de manutenção:', err);
    }
  };

  // Buscar configuração de manutenção de um veículo
  const getVehicleMaintenanceConfig = async (carId: string): Promise<VehicleMaintenanceConfig[]> => {
    try {
      const { data, error } = await supabase
        .from('vehicle_maintenance_config')
        .select(`
          *,
          maintenance_types!inner(*)
        `)
        .eq('car_id', carId)
        .eq('maintenance_types.is_active', true);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Erro ao buscar configuração de manutenção:', err);
      return [];
    }
  };

  // Atualizar configuração de manutenção
  const updateMaintenanceConfig = async (
    carId: string,
    maintenanceTypeId: string,
    kmInterval: number,
    timeIntervalMonths: number,
    isEnabled: boolean = true
  ) => {
    try {
      const { error } = await supabase
        .from('vehicle_maintenance_config')
        .upsert({
          car_id: carId,
          maintenance_type_id: maintenanceTypeId,
          km_interval: kmInterval,
          time_interval_months: timeIntervalMonths,
          is_enabled: isEnabled,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      // Recarregar alertas
      await fetchMaintenanceAlerts();
      return true;
    } catch (err) {
      console.error('Erro ao atualizar configuração:', err);
      throw err;
    }
  };

  // Registrar manutenção realizada
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
    try {
      const { data, error } = await supabase.rpc('register_maintenance', {
        p_car_id: carId,
        p_maintenance_type_id: maintenanceTypeId,
        p_maintenance_date: maintenanceDate,
        p_km_at_maintenance: kmAtMaintenance,
        p_description: description,
        p_cost: cost,
        p_performed_by: performedBy,
        p_notes: notes
      });

      if (error) throw error;
      
      // Recarregar alertas
      await fetchMaintenanceAlerts();
      return data;
    } catch (err) {
      console.error('Erro ao registrar manutenção:', err);
      throw err;
    }
  };

  // Buscar histórico de manutenção
  const getMaintenanceHistory = async (carId?: string, maintenanceTypeId?: string): Promise<MaintenanceHistory[]> => {
    try {
      let query = supabase
        .from('maintenance_history')
        .select(`
          *,
          cars!inner(plate, model, brand),
          maintenance_types!inner(name, category)
        `)
        .order('maintenance_date', { ascending: false });

      if (carId) {
        query = query.eq('car_id', carId);
      }

      if (maintenanceTypeId) {
        query = query.eq('maintenance_type_id', maintenanceTypeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return data || [];
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
      return [];
    }
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