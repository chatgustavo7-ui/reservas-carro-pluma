import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DestinationAutocomplete } from '@/components/DestinationAutocomplete';
import KmModal from '@/components/KmModal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { withRetry } from '@/integrations/supabase/retryUtils';

import { ArrowLeft, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { todayISO } from '@/utils/kmUtils';
import { formatDateStringForDisplay } from '@/utils/dateUtils';

const useReservations = (filters: {
  driver: string;
  car: string;
  destination: string;
  start: string;
  end: string;
}) => {
  return useQuery({
    queryKey: ['reservations', filters],
    queryFn: async () => {
      let query = supabase.from('reservations').select('*').order('created_at', { ascending: false });

      if (filters.driver) query = query.ilike('driver_name', `%${filters.driver}%`);
      if (filters.car) query = query.ilike('car', `%${filters.car}%`);
      if (filters.destination) query = query.contains('destinations', [filters.destination]);

      // overlap: pickup_date <= end AND return_date >= start
      if (filters.start && filters.end) {
        query = query.lte('pickup_date', filters.end).gte('return_date', filters.start);
      } else if (filters.start) {
        query = query.gte('return_date', filters.start);
      } else if (filters.end) {
        query = query.lte('pickup_date', filters.end);
      }

      const result = await withRetry.select(() => query);
      if (result.error) throw result.error;
      return result.data as Array<{
        id: string;
        driver_name: string;
        companions: string[];
        car: string;
        pickup_date: string;
        return_date: string;
        destinations: string[];
        status: 'ativa' | 'concluída' | 'cancelada';
        created_at: string;
        driver_email?: string;
        start_km?: number;
        end_km?: number;
      }>;
    },
    retry: false
  });
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const variant = status === 'ativa' ? 'default' : status === 'concluída' ? 'secondary' : 'destructive';
  return <Badge variant={variant as 'default' | 'secondary' | 'destructive'}>{status}</Badge>;
};

const KmStatusBadge: React.FC<{ reservation: { return_date: string; end_km?: number | null } }> = ({ reservation }) => {
  const today = todayISO();
  const isPastDue = reservation.return_date < today;
  const hasEndKm = reservation.end_km !== null && reservation.end_km !== undefined;
  
  if (isPastDue && !hasEndKm) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        KM pendente
      </Badge>
    );
  }
  
  if (hasEndKm) {
    return <Badge variant="secondary">KM informado</Badge>;
  }
  
  return null;
};

const Reservations: React.FC = () => {
  const [driver, setDriver] = useState('');
  const [car, setCar] = useState('');
  const [destination, setDestination] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [kmModalOpen, setKmModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useReservations({ driver, car, destination, start, end });

  const handleCancelReservation = async (id: string) => {
    try {
      // Primeiro, buscar os dados da reserva para obter o car_id
      const { data: reservationData, error: fetchError } = await supabase
        .from('reservations')
        .select('car_id, status')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('reservations')
        .update({ status: 'cancelada' })
        .eq('id', id);

      if (error) throw error;

      // Se a reserva estava ativa, atualizar o status do carro para disponível
      if (reservationData?.status === 'ativa' && reservationData?.car_id) {
        const { error: carError } = await supabase
          .from('cars')
          .update({ 
            status: 'disponível',
            updated_at: new Date().toISOString()
          })
          .eq('id', reservationData.car_id);

        if (carError) {
          console.error('Erro ao atualizar status do carro:', carError);
        }
      }

      toast({
        title: 'Reserva cancelada',
        description: 'A reserva foi cancelada com sucesso.',
      });

      // Invalidar queries para atualizar a interface
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === 'car-status'
      });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    } catch (error) {
      toast({
        title: 'Erro ao cancelar',
        description: 'Ocorreu um erro ao cancelar a reserva. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveReservation = async (id: string) => {
    try {
      // Primeiro, buscar os dados da reserva para obter o car_id e status
      const { data: reservationData, error: fetchError } = await supabase
        .from('reservations')
        .select('car_id, status, start_km, end_km, created_at')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const carId = reservationData.car_id;
      const removedReservationStatus = reservationData.status;

      // Remover a reserva
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Buscar a última reserva válida para este carro (ordenada por data de criação)
      const { data: lastReservation, error: lastReservationError } = await supabase
        .from('reservations')
        .select('status, start_km, end_km, created_at')
        .eq('car_id', carId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const carUpdateData: {
        status: string;
        updated_at: string;
        current_km?: number;
      } = {
        status: 'disponível',
        updated_at: new Date().toISOString()
      };

      let statusMessage = 'Carro resetado para disponível';

      if (lastReservation && !lastReservationError) {
        // Há uma reserva mais recente - definir status baseado nela
        switch (lastReservation.status) {
          case 'ativa':
            carUpdateData.status = 'em uso';
            statusMessage = 'Status do carro atualizado para "em uso" baseado na última reserva ativa';
            // Usar quilometragem inicial da última reserva ativa
            if (lastReservation.start_km) {
              carUpdateData.current_km = lastReservation.start_km;
            }
            break;
          case 'completed':
            carUpdateData.status = 'lavar';
            statusMessage = 'Status do carro atualizado para "lavar" baseado na última reserva concluída';
            // Usar quilometragem final da última reserva concluída
            if (lastReservation.end_km) {
              carUpdateData.current_km = lastReservation.end_km;
            }
            break;
          case 'cancelada':
            carUpdateData.status = 'disponível';
            statusMessage = 'Status do carro atualizado para "disponível" baseado na última reserva cancelada';
            // Usar quilometragem inicial da última reserva cancelada
            if (lastReservation.start_km) {
              carUpdateData.current_km = lastReservation.start_km;
            }
            break;
          default:
            carUpdateData.status = 'disponível';
            statusMessage = 'Status do carro resetado para "disponível"';
        }
      } else {
        // Não há outras reservas - resetar para disponível e zerar quilometragem
        carUpdateData.current_km = null;
        statusMessage = 'Carro resetado para "disponível" - nenhuma reserva restante, quilometragem zerada';
      }

      // Atualizar o status do carro
      const { error: carError } = await supabase
        .from('cars')
        .update(carUpdateData)
        .eq('id', carId);

      if (carError) {
        console.error('Erro ao atualizar status do carro:', carError);
        toast({
          title: 'Aviso',
          description: 'Reserva removida, mas houve erro ao atualizar o status do carro.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Reserva removida com sucesso',
          description: `${statusMessage}`,
        });
      }

      // Invalidar queries para atualizar a interface
      await Promise.all([
        queryClient.invalidateQueries({ 
          predicate: (query) => query.queryKey[0] === 'car-status'
        }),
        queryClient.invalidateQueries({ queryKey: ['reservations'] }),
        queryClient.invalidateQueries({ queryKey: ['cars'] }),
        queryClient.refetchQueries({ 
          predicate: (query) => query.queryKey[0] === 'car-status'
        }),
        // Forçar refresh completo
        queryClient.resetQueries({ 
          predicate: (query) => query.queryKey[0] === 'car-status'
        })
      ]);
      
      // Log para debug
      console.log('🔄 Queries invalidadas após remoção de reserva');
      console.log('📊 Dados do carro atualizados:', carUpdateData);
    } catch (error) {
      console.error('Erro ao remover reserva:', error);
      toast({
        title: 'Erro ao remover',
        description: 'Não foi possível remover a reserva. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleCompleteTrip = (reservationData: Reservation) => {
    setSelectedReservation(reservationData);
    setKmModalOpen(true);
  };

  const handleKmModalSuccess = () => {
    // Invalidar queries para atualizar a lista
    queryClient.invalidateQueries({ queryKey: ['reservations'] });
  };

  useEffect(() => {
    document.title = 'Reservas | Visualizar e Filtrar';
    const meta = document.querySelector('meta[name="description"]') || document.createElement('meta');
    meta.setAttribute('name', 'description');
    meta.setAttribute('content', 'Visualize e filtre reservas por condutor, carro, datas e destinos.');
    document.head.appendChild(meta);

    const link = document.querySelector('link[rel="canonical"]') || document.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', window.location.href);
    document.head.appendChild(link);
  }, []);

  const resetFilters = () => {
    setDriver('');
    setCar('');
    setDestination('');
    setStart('');
    setEnd('');
    refetch();
  };

  const hasFilters = useMemo(() => driver || car || destination || start || end, [driver, car, destination, start, end]);

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
            <h1 className="text-3xl font-bold mb-2">Reservas</h1>
            <p className="text-muted-foreground">Visualize todas as reservas e aplique filtros por condutor, carro, datas e destino.</p>
          </header>

          <section aria-label="Filtros" className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <Input placeholder="Condutor" value={driver} onChange={(e) => setDriver(e.target.value)} />
              <Input placeholder="Carro" value={car} onChange={(e) => setCar(e.target.value)} />
              <div>
                <DestinationAutocomplete value={destination} onChange={setDestination} placeholder="Destino" />
              </div>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} aria-label="Início" />
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} aria-label="Fim" />
            </div>
            <div className="mt-3 flex gap-2">
              <Button type="button" onClick={() => refetch()}>Aplicar</Button>
              {hasFilters && (
                <Button type="button" variant="outline" onClick={resetFilters}>
                  Limpar filtros
                </Button>
              )}
            </div>
          </section>

          <section aria-label="Lista de reservas">
            {isLoading && <p className="text-muted-foreground">Carregando reservas...</p>}
            {error && <p className="text-destructive">Falha ao carregar reservas.</p>}

            {!isLoading && !error && (
              <div className="rounded-md border">
                  <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Condutor</TableHead>
                       <TableHead>Carro</TableHead>
                       <TableHead>Retirada</TableHead>
                       <TableHead>Devolução</TableHead>
                       <TableHead>KM</TableHead>
                       <TableHead>Destinos</TableHead>
                       <TableHead>Status</TableHead>
                       <TableHead>Ações</TableHead>
                     </TableRow>
                   </TableHeader>
                  <TableBody>
                    {data && data.length > 0 ? (
                       data.map((r) => (
                         <TableRow key={r.id}>
                           <TableCell>
                             <div>
                               <div className="font-medium">{r.driver_name}</div>
                               {r.companions && r.companions.length > 0 && (
                                 <div className="text-sm text-muted-foreground">
                                   +{r.companions.length} acompanhante{r.companions.length > 1 ? 's' : ''}
                                 </div>
                               )}
                             </div>
                           </TableCell>
                           <TableCell>{r.car}</TableCell>
                           <TableCell>{formatDateStringForDisplay(r.pickup_date) || '-'}</TableCell>
                           <TableCell>{formatDateStringForDisplay(r.return_date) || '-'}</TableCell>
                           <TableCell>
                             <div className="space-y-1">
                               {r.start_km && (
                                 <div className="text-xs text-muted-foreground">
                                   Inicial: {r.start_km.toLocaleString()}
                                 </div>
                               )}
                               {r.end_km && (
                                 <div className="text-xs">
                                   Final: {r.end_km.toLocaleString()}
                                 </div>
                               )}
                               <KmStatusBadge reservation={r} />
                             </div>
                           </TableCell>
                           <TableCell>
                             <div className="flex flex-wrap gap-1">
                               {(r.destinations || []).map((d, i) => (
                                 <Badge key={`${r.id}-${i}`} variant="secondary">{d}</Badge>
                               ))}
                             </div>
                           </TableCell>
                           <TableCell><StatusBadge status={r.status} /></TableCell>
                           <TableCell>
                             <div className="flex gap-2">
                               {r.status === 'ativa' && (
                                 <>
                                   <AlertDialog>
                                     <AlertDialogTrigger asChild>
                                       <Button variant="default" size="sm">
                                         <CheckCircle className="h-4 w-4 mr-1" />
                                         Concluir
                                       </Button>
                                     </AlertDialogTrigger>
                                     <AlertDialogContent>
                                       <AlertDialogHeader>
                                         <AlertDialogTitle>Concluir Viagem</AlertDialogTitle>
                                         <AlertDialogDescription>
                                           Tem certeza que deseja marcar esta viagem como concluída?
                                         </AlertDialogDescription>
                                       </AlertDialogHeader>
                                       <AlertDialogFooter>
                                         <AlertDialogCancel>Não</AlertDialogCancel>
                                         <AlertDialogAction onClick={() => handleCompleteTrip(r)}>
                                           Sim, concluir
                                         </AlertDialogAction>
                                       </AlertDialogFooter>
                                     </AlertDialogContent>
                                   </AlertDialog>
                                   <AlertDialog>
                                     <AlertDialogTrigger asChild>
                                       <Button variant="outline" size="sm">
                                         <Trash2 className="h-4 w-4 mr-1" />
                                         Cancelar
                                       </Button>
                                     </AlertDialogTrigger>
                                     <AlertDialogContent>
                                       <AlertDialogHeader>
                                         <AlertDialogTitle>Cancelar Reserva</AlertDialogTitle>
                                         <AlertDialogDescription>
                                           Tem certeza que deseja cancelar esta reserva? Esta ação não pode ser desfeita.
                                         </AlertDialogDescription>
                                       </AlertDialogHeader>
                                       <AlertDialogFooter>
                                         <AlertDialogCancel>Não</AlertDialogCancel>
                                         <AlertDialogAction onClick={() => handleCancelReservation(r.id)}>
                                           Sim, cancelar
                                         </AlertDialogAction>
                                       </AlertDialogFooter>
                                     </AlertDialogContent>
                                   </AlertDialog>
                                 </>
                               )}
                               <AlertDialog>
                                 <AlertDialogTrigger asChild>
                                   <Button variant="destructive" size="sm">
                                     <Trash2 className="h-4 w-4 mr-1" />
                                     Remover
                                   </Button>
                                 </AlertDialogTrigger>
                                 <AlertDialogContent>
                                     <AlertDialogHeader>
                                       <AlertDialogTitle>Remover Reserva</AlertDialogTitle>
                                       <AlertDialogDescription asChild>
                                         <div>
                                           <p>Tem certeza que deseja remover esta reserva? Esta ação é permanente e não pode ser desfeita.</p>
                                           <div className="mt-4">
                                             <strong>O que acontecerá:</strong>
                                             <ul className="list-disc list-inside mt-2 space-y-1">
                                               <li>A reserva será removida permanentemente do sistema</li>
                                               <li>O status do carro será automaticamente ajustado baseado na última reserva válida</li>
                                               <li>Se não houver outras reservas, o carro voltará ao status 'disponível'</li>
                                             </ul>
                                           </div>
                                         </div>
                                       </AlertDialogDescription>
                                     </AlertDialogHeader>
                                   <AlertDialogFooter>
                                     <AlertDialogCancel>Não</AlertDialogCancel>
                                     <AlertDialogAction onClick={() => handleRemoveReservation(r.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                       Sim, remover
                                     </AlertDialogAction>
                                   </AlertDialogFooter>
                                 </AlertDialogContent>
                               </AlertDialog>
                             </div>
                           </TableCell>
                        </TableRow>
                      ))
                     ) : (
                       <TableRow>
                         <TableCell colSpan={8} className="text-center text-muted-foreground">
                           Nenhuma reserva encontrada.
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
      
      {/* Modal de Quilometragem */}
      {selectedReservation && (
        <KmModal
          isOpen={kmModalOpen}
          onClose={() => setKmModalOpen(false)}
          reservation={selectedReservation}
          onSuccess={handleKmModalSuccess}
        />
      )}
    </main>
  );
};

export default Reservations;
