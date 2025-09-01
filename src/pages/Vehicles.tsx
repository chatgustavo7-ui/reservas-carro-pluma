import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Car, Calendar, Gauge, AlertTriangle, CheckCircle } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { formatDateObjectForDisplay } from '@/utils/dateUtils';

interface Vehicle {
  id: string;
  model: string;
  plate: string;
  color: string;
  year: number;
  current_km: number;
  is_active: boolean;
  last_maintenance_km?: number;
  maintenance_interval_km?: number;
  km_margin?: number;
  can_use?: boolean;
  maintenance_status?: string;
  revision_status?: string;
  last_reservation?: {
    end_date: string;
    conductor_name: string;
  };
}

const Vehicles = () => {
  const { data: vehicles, isLoading, error } = useQuery({
    queryKey: ['vehicles-info'],
    queryFn: async () => {
      // First, get all cars with maintenance status
      const { data: carsData, error: carsError } = await supabase
        .from('cars_maintenance_status')
        .select(`
          id,
          model,
          plate,
          color,
          year,
          current_km,
          is_active,
          last_maintenance_km,
          maintenance_interval_km,
          km_margin,
          can_use,
          maintenance_status,
          revision_status
        `)
        .order('model', { ascending: true });

      if (carsError) throw carsError;

      // Then, for each car, get its last reservation
      const processedData = await Promise.all(
        carsData?.map(async (car) => {
          const { data: reservationData } = await supabase
            .from('reservations')
            .select(`
              end_date,
              conductors!inner(name)
            `)
            .eq('car_id', car.id)
            .order('end_date', { ascending: false })
            .limit(1);

          const lastReservation = reservationData?.[0];
          
          return {
            ...car,
            last_reservation: lastReservation ? {
              end_date: lastReservation.end_date,
              conductor_name: lastReservation.conductors?.name || 'N/A'
            } : undefined
          };
        }) || []
      );

      return processedData as Vehicle[];
    }
  });

  const getMaintenanceStatus = (vehicle: Vehicle) => {
    if (!vehicle.maintenance_status) {
      return { status: 'unknown', message: 'Dados de manutenção não disponíveis' };
    }

    // Usar o status calculado pela view que considera a margem
    switch (vehicle.maintenance_status) {
      case 'overdue_blocked':
        return { status: 'overdue', message: 'Manutenção vencida (Bloqueado)' };
      case 'overdue_margin':
        return { status: 'overdue-margin', message: 'Manutenção vencida - Dentro da margem' };
      case 'due_soon':
        return { status: 'due-soon', message: 'Manutenção próxima' };
      case 'ok':
        return { status: 'ok', message: 'Manutenção em dia' };
      default:
        return { status: 'unknown', message: 'Status desconhecido' };
    }
  };

  const getDaysSinceLastUse = (lastReservationDate?: string) => {
    if (!lastReservationDate) return null;
    return differenceInDays(new Date(), new Date(lastReservationDate));
  };

  const getStatusBadge = (vehicle: Vehicle) => {
    if (!vehicle.is_active) {
      return <Badge variant="destructive">Inativo</Badge>;
    }

    // Verificar se o carro pode ser usado (considerando margem)
    if (!vehicle.can_use) {
      return <Badge variant="destructive">Bloqueado</Badge>;
    }

    const maintenanceStatus = getMaintenanceStatus(vehicle);
    if (maintenanceStatus.status === 'overdue') {
      return <Badge variant="destructive">Manutenção Pendente</Badge>;
    } else if (maintenanceStatus.status === 'overdue-margin') {
      return <Badge variant="secondary">Manutenção Vencida - Margem</Badge>;
    } else if (maintenanceStatus.status === 'due-soon') {
      return <Badge variant="secondary">Manutenção Próxima</Badge>;
    }

    return <Badge variant="default">Disponível</Badge>;
  };

  if (isLoading) {
    return (
      <Layout title="Informações dos Veículos">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Carregando informações dos veículos...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Informações dos Veículos">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-red-600">Erro ao carregar informações dos veículos</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Informações dos Veículos">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles?.map((vehicle) => {
            const maintenanceStatus = getMaintenanceStatus(vehicle);
            const daysSinceLastUse = getDaysSinceLastUse(vehicle.last_reservation?.end_date);

            return (
              <Card key={vehicle.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Car className="h-5 w-5 text-blue-600" />
                      <span className="text-lg">{vehicle.model}</span>
                    </CardTitle>
                    {getStatusBadge(vehicle)}
                  </div>
                  <div className="text-sm text-gray-600">
                    <p><strong>Placa:</strong> {vehicle.plate}</p>
                    <p><strong>Cor:</strong> {vehicle.color}</p>
                    <p><strong>Ano:</strong> {vehicle.year}</p>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Quilometragem */}
                  <div className="flex items-center space-x-2">
                    <Gauge className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Quilometragem Atual</p>
                      <p className="text-lg font-bold text-blue-600">
                        {vehicle.current_km?.toLocaleString() || 'N/A'} km
                      </p>
                    </div>
                  </div>

                  {/* Última Utilização */}
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Última Utilização</p>
                      {vehicle.last_reservation ? (
                        <div>
                          <p className="text-sm text-gray-600">
                            {formatDateObjectForDisplay(new Date(vehicle.last_reservation.end_date))}
                          </p>
                          <p className="text-xs text-gray-500">
                            por {vehicle.last_reservation.conductor_name}
                          </p>
                          {daysSinceLastUse !== null && (
                            <p className={`text-xs font-medium ${
                              daysSinceLastUse > 30 ? 'text-red-600' : 
                              daysSinceLastUse > 14 ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {daysSinceLastUse === 0 ? 'Hoje' : 
                               daysSinceLastUse === 1 ? 'Há 1 dia' : 
                               `Há ${daysSinceLastUse} dias`}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Nunca utilizado</p>
                      )}
                    </div>
                  </div>

                  {/* Status de Manutenção */}
                  <div className="flex items-center space-x-2">
                    {maintenanceStatus.status === 'overdue' ? (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    ) : maintenanceStatus.status === 'due-soon' ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">Manutenção</p>
                      <p className={`text-xs ${
                        maintenanceStatus.status === 'overdue' ? 'text-red-600' :
                        maintenanceStatus.status === 'due-soon' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {maintenanceStatus.message}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {vehicles?.length === 0 && (
          <div className="text-center py-12">
            <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg text-gray-600">Nenhum veículo encontrado</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Vehicles;