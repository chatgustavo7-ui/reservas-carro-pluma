import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { withRetry } from '@/integrations/supabase/retryUtils';
import { differenceInDays } from 'date-fns';
import { ArrowLeft, Car, AlertTriangle, CheckCircle, Clock, Edit } from 'lucide-react';
import { formatDateStringForDisplay } from '@/utils/dateUtils';
import { EditCarModal } from '@/components/EditCarModal';

interface CarWithLastUse {
  id: string;
  plate: string;
  model: string;
  brand: string;
  color: string;
  year: number;
  current_km: number;
  last_revision_km: number;
  next_revision_km: number;
  next_maintenance_km: number;
  status: 'disponível' | 'em_uso' | 'manutenção' | 'indisponível';
  created_at: string;
  updated_at: string;
  last_trip_date?: string;
  last_trip_driver?: string;
  last_trip_destination?: string;
  days_since_last_use?: number;
  needs_maintenance?: boolean;
}

const useCarStatus = (filters: {
  model: string;
  plate: string;
  status: string;
}) => {
  return useQuery({
    queryKey: ['car-status', filters],
    queryFn: async () => {
      // Buscar todos os carros
      let carsQuery = supabase
        .from('cars')
        .select('*')
        .order('updated_at', { ascending: false });

      // Aplicar filtros
      if (filters.model) {
        carsQuery = carsQuery.ilike('model', `%${filters.model}%`);
      }
      if (filters.plate) {
        carsQuery = carsQuery.ilike('plate', `%${filters.plate}%`);
      }
      if (filters.status) {
        carsQuery = carsQuery.eq('status', filters.status);
      }

      const carsResult = await withRetry.select(() => carsQuery);
      if (carsResult.error) throw carsResult.error;
      const carsData = carsResult.data;
      
      // Debug: mostrar dados dos carros carregados
      console.log('🚗 Dados dos carros carregados:', carsData);
      carsData?.forEach(car => {
        console.log(`Carro ${car.model} (${car.plate}): current_km = ${car.current_km}, status = ${car.status}`);
      });

      // Buscar todas as reservas concluídas para obter informações da última viagem
      const reservationsResult = await withRetry.select(
        () => supabase
          .from('reservations')
          .select('car_id, return_date, driver_name, destinations, status')
          .eq('status', 'completed')
          .order('return_date', { ascending: false })
      );
      
      if (reservationsResult.error) throw reservationsResult.error;
      const allReservations = reservationsResult.data;

      // Buscar reservas ativas para hoje
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      console.log('Buscando reservas para a data:', todayStr);
      
      // Buscar TODAS as reservas para hoje (independente do status) para debug
      const todayResult = await withRetry.select(
        () => supabase
          .from('reservations')
          .select('*')
          .eq('pickup_date', todayStr)
      );
      const todayReservations = todayResult.data;
      
      console.log('=== DEBUG: Todas as reservas para hoje ===');
      console.log('Data de hoje:', todayStr);
      console.log('Reservas encontradas para hoje:', todayReservations);
      console.log('Total de reservas para hoje:', todayReservations?.length || 0);
      
      // Buscar reservas ativas (que estão em andamento hoje)
      const activeResult = await withRetry.select(
        () => supabase
          .from('reservations')
          .select('car_id, status, pickup_date, return_date, driver_name, car')
          .lte('pickup_date', todayStr)  // pickup_date <= hoje
          .gte('return_date', todayStr) // return_date >= hoje
      );
      
      if (activeResult.error) {
        console.error('Erro ao buscar reservas ativas:', activeResult.error);
        throw activeResult.error;
      }
      const activeReservations = activeResult.data;
      
      console.log('=== DEBUG: Reservas ativas (em andamento hoje) ===');
      console.log('Reservas ativas encontradas:', activeReservations);
      console.log('Total de reservas ativas:', activeReservations?.length || 0);
      
      // Debug: mostrar detalhes de cada reserva ativa
      activeReservations?.forEach(reservation => {
        console.log(`Reserva - Car ID: ${reservation.car_id}, Carro: ${reservation.car}, Status: ${reservation.status}, Início: ${reservation.pickup_date}, Fim: ${reservation.return_date}`);
      });

      // Processar dados para incluir informações da última viagem
      const processedCars: CarWithLastUse[] = carsData.map(car => {
        // Encontrar a última reserva concluída para este carro
        const carReservations = allReservations
          ?.filter(reservation => reservation.car_id === car.id)
          ?.sort((a, b) => new Date(b.return_date).getTime() - new Date(a.return_date).getTime());

        const lastTrip = carReservations?.[0];
        const daysSinceLastUse = lastTrip 
          ? differenceInDays(today, new Date(lastTrip.return_date))
          : differenceInDays(today, new Date(car.created_at));

        const needsMaintenance = car.current_km ? car.current_km >= car.next_maintenance_km : false;

        // Verificar se o carro tem reserva ativa para hoje
        const activeReservation = activeReservations?.find(reservation => 
          reservation.car_id === car.id
        );

        // Debug: mostrar informações do carro sendo processado
        console.log(`Processando carro: ${car.model} (ID: ${car.id}, Placa: ${car.license_plate || car.plate}), Status original: ${car.status}`);
        
        // Atualizar status baseado nas reservas ativas
        let currentStatus = car.status;
        
        if (activeReservation) {
          console.log(`✅ Carro ${car.model} tem reserva ativa:`, activeReservation);
          currentStatus = 'em_uso';
        } else {
          console.log(`❌ Carro ${car.model} não tem reserva ativa para hoje`);
        }

        return {
          ...car,
          status: currentStatus,
          activeReservation: activeReservation || null,
          last_trip_date: lastTrip?.return_date,
          last_trip_driver: lastTrip?.driver_name,
          last_trip_destination: lastTrip?.destinations?.[0],
          days_since_last_use: daysSinceLastUse,
          needs_maintenance: needsMaintenance
        };
      });

      return processedCars;
    },
  });
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getVariant = () => {
    switch (status) {
      case 'disponível': return 'default';
      case 'em_uso': return 'secondary';
      case 'manutenção': return 'destructive';
      case 'indisponível': return 'outline';
      case 'lavar': return 'secondary';
      default: return 'default';
    }
  };

  const getDisplayText = () => {
    switch (status) {
      case 'lavar': return 'No Lavacar';
      default: return status;
    }
  };

  return <Badge variant={getVariant()}>{getDisplayText()}</Badge>;
};

const DaysWithoutUseBadge: React.FC<{ days: number }> = ({ days }) => {
  if (days <= 7) {
    return (
      <Badge variant="default" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        {days} dias
      </Badge>
    );
  } else if (days <= 30) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {days} dias
      </Badge>
    );
  } else {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        {days} dias sem uso
      </Badge>
    );
  }
};

const MaintenanceBadge: React.FC<{ car: CarWithLastUse }> = ({ car }) => {
  if (!car.current_km || !car.next_maintenance_km) return null;

  const kmUntilMaintenance = car.next_maintenance_km - car.current_km;
  const margin = (car as any).km_margin || 0;
  const kmUntilMarginLimit = (car.next_maintenance_km + margin) - car.current_km;

  // Se passou da margem, bloquear completamente
  if (kmUntilMarginLimit <= 0) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Manutenção Vencida (Bloqueado)
      </Badge>
    );
  }

  // Se passou da manutenção mas ainda dentro da margem
  if (kmUntilMaintenance <= 0 && kmUntilMarginLimit > 0) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Manutenção Vencida - Margem: {kmUntilMarginLimit.toLocaleString()} km
      </Badge>
    );
  }

  // Alerta de aproximação da manutenção
  if (kmUntilMaintenance <= 1000) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {kmUntilMaintenance.toLocaleString()} km para manutenção
      </Badge>
    );
  }

  return null;
};

const RevisionBadge: React.FC<{ car: CarWithLastUse }> = ({ car }) => {
  if (!car.current_km || !car.next_revision_km) return null;

  const kmUntilRevision = car.next_revision_km - car.current_km;
  const margin = (car as any).km_margin || 0;
  const kmUntilMarginLimit = (car.next_revision_km + margin) - car.current_km;

  // Se passou da margem, bloquear completamente
  if (kmUntilMarginLimit <= 0) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        🔴 REVISÃO BLOQUEADA! {Math.abs(kmUntilMarginLimit).toLocaleString()} km além da margem
      </Badge>
    );
  }

  // Se passou da revisão mas ainda dentro da margem
  if (kmUntilRevision <= 0 && kmUntilMarginLimit > 0) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        🟠 REVISÃO VENCIDA! {Math.abs(kmUntilRevision).toLocaleString()} km em atraso - Margem: {kmUntilMarginLimit.toLocaleString()} km
      </Badge>
    );
  }

  // Revisão urgente (menos de 500 km)
  if (kmUntilRevision <= 500) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        🟠 REVISÃO URGENTE! Faltam {kmUntilRevision.toLocaleString()} km
      </Badge>
    );
  }

  // Revisão próxima (menos de 1000 km)
  if (kmUntilRevision <= 1000) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        🟡 Revisão em {kmUntilRevision.toLocaleString()} km
      </Badge>
    );
  }

  return null;
};

const CarStatus: React.FC = () => {
  const [model, setModel] = useState('');
  const [plate, setPlate] = useState('');
  const [status, setStatus] = useState('');
  const [editingCar, setEditingCar] = useState<CarWithLastUse | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data, isLoading, error, refetch } = useCarStatus({ model, plate, status });

  useEffect(() => {
    document.title = 'Status dos Carros | Controle e Monitoramento';
    const meta = document.querySelector('meta[name="description"]') || document.createElement('meta');
    meta.setAttribute('name', 'description');
    meta.setAttribute('content', 'Monitore o status dos carros, quilometragem, última utilização e necessidades de manutenção.');
    document.head.appendChild(meta);

    const link = document.querySelector('link[rel="canonical"]') || document.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', window.location.href);
    document.head.appendChild(link);
  }, []);

  const resetFilters = () => {
    setModel('');
    setPlate('');
    setStatus('');
    refetch();
  };

  const handleEditCar = (car: CarWithLastUse) => {
    setEditingCar(car);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditingCar(null);
    setIsEditModalOpen(false);
  };

  const hasFilters = useMemo(() => model || plate || status, [model, plate, status]);

  return (
    <main className="min-h-screen bg-background py-12">
      <section className="px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-4">
            <Button asChild variant="outline">
              <Link to="/" aria-label="Voltar para o menu principal">
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
              </Link>
            </Button>
          </div>
          <header className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
              <Car className="h-8 w-8" />
              Status dos Carros
            </h1>
            <p className="text-muted-foreground">
              Monitore o status dos carros, quilometragem atual, última utilização e necessidades de manutenção.
            </p>
          </header>

          <section aria-label="Filtros" className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input 
                placeholder="Modelo" 
                value={model} 
                onChange={(e) => setModel(e.target.value)} 
              />
              <Input 
                placeholder="Placa" 
                value={plate} 
                onChange={(e) => setPlate(e.target.value)} 
              />
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={status} 
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Todos os status</option>
                <option value="disponível">Disponível</option>
                <option value="em_uso">Em uso</option>
                <option value="manutenção">Manutenção</option>
                <option value="indisponível">Indisponível</option>
                <option value="lavar">No Lavacar</option>
              </select>
              <div className="flex gap-2">
                <Button type="button" onClick={() => refetch()} className="flex-1">
                  Aplicar
                </Button>
                {hasFilters && (
                  <Button type="button" variant="outline" onClick={resetFilters}>
                    Limpar
                  </Button>
                )}
              </div>
            </div>
          </section>

          <section aria-label="Lista de carros">
            {isLoading && <p className="text-muted-foreground">Carregando status dos carros...</p>}
            {error && <p className="text-destructive">Falha ao carregar status dos carros.</p>}

            {!isLoading && !error && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Placa</TableHead>
                      <TableHead>Quilometragem</TableHead>
                      <TableHead>Última Viagem</TableHead>
                      <TableHead>Tempo sem Uso</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Manutenção</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data && data.length > 0 ? (
                      data.map((car) => (
                        <TableRow key={car.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{car.brand} {car.model}</div>
                              <div className="text-sm text-muted-foreground">
                                {car.color} • {car.year}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">{car.plate}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">
                                {car.current_km ? car.current_km.toLocaleString() + ' km' : '-'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Última revisão: {car.last_revision_km.toLocaleString()} km
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {car.last_trip_date ? (
                              <div className="space-y-1">
                                <div className="text-sm">
                                  {formatDateStringForDisplay(car.last_trip_date)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {car.last_trip_driver}
                                </div>
                                {car.last_trip_destination && (
                                  <div className="text-xs text-muted-foreground">
                                    {car.last_trip_destination}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                Nunca utilizado
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {car.days_since_last_use !== undefined && (
                              <DaysWithoutUseBadge days={car.days_since_last_use} />
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={car.status} />
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <MaintenanceBadge car={car} />
                              <RevisionBadge car={car} />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditCar(car)}
                              className="flex items-center gap-1"
                            >
                              <Edit className="h-4 w-4" />
                              Editar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          Nenhum carro encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </div>
      </section>
      
      <EditCarModal 
        car={editingCar}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
      />
    </main>
  );
};

export default CarStatus;