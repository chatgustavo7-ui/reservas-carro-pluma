import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { withRetry } from '@/integrations/supabase/retryUtils';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Car, Calendar, MapPin, User, Gauge, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { addDays, isAfter, isBefore } from 'date-fns';
import { formatDateTimeForDisplay, formatDateObjectForDisplay } from '@/utils/dateUtils';

interface Car {
  id: string;
  plate: string;
  model: string;
  current_km: number;
  next_maintenance_km: number;
  status: 'available' | 'unavailable' | 'in_use' | 'maintenance';
  unavailable_until?: string;
}

interface Reservation {
  id: string;
  start_date: string;
  end_date: string;
  destination: string;
  status: string;
  car_id: string;
  conductors: {
    name: string;
  };
}

const Status = () => {
  // Buscar carros
  const { data: cars, isLoading: carsLoading } = useQuery({
    queryKey: ['cars-status'],
    queryFn: async () => {
      const result = await withRetry.select(
        () => supabase
          .from('cars')
          .select('*')
          .order('plate', { ascending: true })
      );

      if (result.error) throw result.error;
      return result.data as Car[];
    },
    retry: false // Retry é feito pelo withRetry
  });

  // Buscar reservas ativas e futuras
  const { data: reservations, isLoading: reservationsLoading } = useQuery({
    queryKey: ['reservations-status'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const result = await withRetry.select(
        () => supabase
          .from('reservations')
          .select(`
            *,
            conductors (name)
          `)
          .gte('end_date', today)
          .in('status', ['confirmed', 'in_progress'])
          .order('start_date', { ascending: true })
      );

      if (result.error) throw result.error;
      return result.data as (Reservation & { car_id: string })[];
    },
    retry: false // Retry é feito pelo withRetry
  });

  const { data: fleetStats, isLoading: fleetStatsLoading } = useQuery({
    queryKey: ['fleet-usage-stats'],
    queryFn: async () => {
      const { data, error } = await withRetry(() =>
        supabase.rpc('get_fleet_usage_stats')
      );
      
      if (error) throw error;
      return data;
    }
  });

  const getCarStatus = (car: Car) => {
    const now = new Date();
    
    // Verificar se está em manutenção
    if (car.status === 'maintenance') {
      return {
        status: 'maintenance',
        label: 'Em Manutenção',
        color: 'bg-purple-100 text-purple-800',
        icon: AlertTriangle
      };
    }
    
    // Verificar se está no lavacar
    if (car.status === 'lavar') {
      return {
        status: 'lavar',
        label: 'No Lavacar',
        color: 'bg-blue-100 text-blue-800',
        icon: Car
      };
    }
    
    // Verificar se está indisponível por período de limpeza
    if (car.status === 'unavailable' && car.unavailable_until) {
      const unavailableUntil = new Date(car.unavailable_until);
      if (isAfter(unavailableUntil, now)) {
        return {
          status: 'unavailable',
          label: `Indisponível até ${formatDateTimeForDisplay(unavailableUntil)}`,
          color: 'bg-orange-100 text-orange-800',
          icon: AlertTriangle
        };
      }
    }
    
    // Verificar se está em uso
    const activeReservation = reservations?.find(r => 
      r.car_id === car.id && r.status === 'in_progress'
    );
    
    if (activeReservation) {
      return {
        status: 'in_use',
        label: 'Em Uso',
        color: 'bg-yellow-100 text-yellow-800',
        icon: Car
      };
    }
    
    // Verificar se precisa de manutenção
    if (car.current_km) {
      const kmUntilMaintenance = car.next_maintenance_km - car.current_km;
      if (kmUntilMaintenance <= 1000) {
        return {
          status: 'maintenance_needed',
          label: kmUntilMaintenance <= 0 ? 'Manutenção Vencida' : `Manutenção em ${kmUntilMaintenance} km`,
          color: 'bg-red-100 text-red-800',
          icon: AlertTriangle
        };
      }
    }
    
    return {
      status: 'available',
      label: 'Disponível',
      color: 'bg-green-100 text-green-800',
      icon: CheckCircle
    };
  };

  const getCarReservations = (carId: string) => {
    return reservations?.filter(r => r.car_id === carId) || [];
  };

  if (carsLoading || reservationsLoading || fleetStatsLoading) {
    return (
      <Layout title="Status dos Veículos">
        <div className="text-center py-8">
          <p>Carregando status dos veículos...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Status dos Veículos">
      <div className="space-y-6">
        {/* Resumo Geral */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-500">Disponíveis</p>
                  <p className="text-2xl font-bold text-green-600">
                    {cars?.filter(car => getCarStatus(car).status === 'available').length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Car className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm text-gray-500">Em Uso</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {cars?.filter(car => getCarStatus(car).status === 'in_use').length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-500">Indisponíveis</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {cars?.filter(car => getCarStatus(car).status === 'unavailable').length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Car className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">No Lavacar</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {cars?.filter(car => getCarStatus(car).status === 'lavar').length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm text-gray-500">Manutenção</p>
                  <p className="text-2xl font-bold text-red-600">
                    {cars?.filter(car => ['maintenance', 'maintenance_needed'].includes(getCarStatus(car).status)).length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Estatísticas de Utilização da Frota */}
        {fleetStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Estatísticas de Utilização da Frota</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 p-4 bg-yellow-50 rounded-lg">
                  <Clock className="h-8 w-8 text-yellow-600" />
                  <div>
                    <p className="text-sm text-gray-600">Carros parados há mais de 7 dias</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {fleetStats.cars_idle_7_days || 0}
                    </p>
                    {fleetStats.cars_idle_7_days > 0 && (
                      <p className="text-xs text-yellow-700">Necessitam atenção</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="text-sm text-gray-600">Carros parados há mais de 30 dias</p>
                    <p className="text-2xl font-bold text-red-600">
                      {fleetStats.cars_idle_30_days || 0}
                    </p>
                    {fleetStats.cars_idle_30_days > 0 && (
                      <p className="text-xs text-red-700">Ação urgente necessária</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
                  <Car className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total de carros na frota</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {fleetStats.total_cars || 0}
                    </p>
                    <p className="text-xs text-blue-700">Veículos cadastrados</p>
                  </div>
                </div>
              </div>
              
              {(fleetStats.cars_idle_7_days > 0 || fleetStats.cars_idle_30_days > 0) && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-800">Recomendações:</h4>
                      <ul className="text-sm text-amber-700 mt-1 space-y-1">
                        {fleetStats.cars_idle_7_days > 0 && (
                          <li>• Considere agendar uso dos carros parados há mais de 7 dias</li>
                        )}
                        {fleetStats.cars_idle_30_days > 0 && (
                          <li>• Carros parados há mais de 30 dias precisam de verificação mecânica</li>
                        )}
                        <li>• O algoritmo de sorteio prioriza automaticamente carros há mais tempo sem uso</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Detalhes dos Carros */}
        <div className="space-y-4">
          {cars?.map((car) => {
            const status = getCarStatus(car);
            const carReservations = getCarReservations(car.id);
            const StatusIcon = status.icon;
            
            return (
              <Card key={car.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Car className="h-6 w-6" />
                      <div>
                        <h3 className="text-lg font-semibold">{car.model}</h3>
                        <p className="text-sm text-gray-500">{car.plate}</p>
                      </div>
                    </div>
                    <Badge className={status.color}>
                      <StatusIcon className="h-4 w-4 mr-1" />
                      {status.label}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <Gauge className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Quilometragem Atual</p>
                        <p className="font-medium">{car.current_km ? car.current_km.toLocaleString() + ' km' : '-'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Próxima Manutenção</p>
                        <p className="font-medium">{car.next_maintenance_km.toLocaleString()} km</p>
                        <p className="text-xs text-gray-400">
                          Faltam {car.current_km ? (car.next_maintenance_km - car.current_km).toLocaleString() : car.next_maintenance_km.toLocaleString()} km
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Último Uso</p>
                        {car.last_used_date ? (
                          <>
                            <p className="font-medium">
                              {formatDateObjectForDisplay(new Date(car.last_used_date))}
                            </p>
                            <p className="text-xs text-gray-400">
                              {(() => {
                                const daysSinceLastUse = Math.floor(
                                  (new Date().getTime() - new Date(car.last_used_date).getTime()) / (1000 * 60 * 60 * 24)
                                );
                                if (daysSinceLastUse === 0) return 'Usado hoje';
                                if (daysSinceLastUse === 1) return 'Há 1 dia';
                                return `Há ${daysSinceLastUse} dias`;
                              })()} 
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-gray-400">Nunca usado</p>
                            <p className="text-xs text-gray-400">Carro novo</p>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Reservas Futuras</p>
                        <p className="font-medium">{carReservations.length}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Reservas Futuras */}
                  {carReservations.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Próximas Reservas:</h4>
                      <div className="space-y-2">
                        {carReservations.slice(0, 3).map((reservation) => (
                          <div key={reservation.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              <span className="text-sm">
                                {formatDateObjectForDisplay(new Date(reservation.start_date)).slice(0, 5)} - {formatDateObjectForDisplay(new Date(reservation.end_date)).slice(0, 5)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <MapPin className="h-4 w-4 text-gray-500" />
                              <span className="text-sm">{reservation.destination}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <span className="text-sm">{reservation.conductors.name}</span>
                            </div>
                          </div>
                        ))}
                        {carReservations.length > 3 && (
                          <p className="text-sm text-gray-500 text-center">
                            +{carReservations.length - 3} reservas adicionais
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default Status;