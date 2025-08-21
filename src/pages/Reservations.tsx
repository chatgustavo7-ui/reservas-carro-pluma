import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DestinationAutocomplete } from '@/components/DestinationAutocomplete';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ArrowLeft, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { todayISO, formatDateBR } from '@/utils/kmUtils';

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
      let query = (supabase as any).from('reservations').select('*').order('created_at', { ascending: false });

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

      const { data, error } = await query;
      if (error) throw error;
      return data as Array<{
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
        odometer_start_km?: number;
        odometer_end_km?: number;
      }>;
    },
  });
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const variant = status === 'ativa' ? 'default' : status === 'concluída' ? 'secondary' : 'destructive';
  return <Badge variant={variant as any}>{status}</Badge>;
};

const KmStatusBadge: React.FC<{ reservation: any }> = ({ reservation }) => {
  const today = todayISO();
  const isPastDue = reservation.return_date < today;
  const hasEndKm = reservation.odometer_end_km !== null && reservation.odometer_end_km !== undefined;
  
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

  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useReservations({ driver, car, destination, start, end });

  const handleCancelReservation = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('reservations')
        .update({ status: 'cancelada' })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Reserva cancelada',
        description: 'A reserva foi cancelada com sucesso.',
      });

      // Invalidar queries para atualizar a lista
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
      const { error } = await (supabase as any)
        .from('reservations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Reserva removida',
        description: 'A reserva foi removida permanentemente.',
      });

      // Invalidar queries para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    } catch (error) {
      toast({
        title: 'Erro ao remover',
        description: 'Não foi possível remover a reserva. Tente novamente.',
        variant: 'destructive',
      });
    }
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
                           <TableCell>{formatDateBR(r.pickup_date) || '-'}</TableCell>
                           <TableCell>{formatDateBR(r.return_date) || '-'}</TableCell>
                           <TableCell>
                             <div className="space-y-1">
                               {r.odometer_start_km && (
                                 <div className="text-xs text-muted-foreground">
                                   Inicial: {r.odometer_start_km.toLocaleString()}
                                 </div>
                               )}
                               {r.odometer_end_km && (
                                 <div className="text-xs">
                                   Final: {r.odometer_end_km.toLocaleString()}
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
                                     <AlertDialogDescription>
                                       Remover esta reserva? Esta ação é permanente e não pode ser desfeita.
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
    </main>
  );
};

export default Reservations;
