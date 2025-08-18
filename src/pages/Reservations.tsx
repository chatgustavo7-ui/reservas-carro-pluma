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
import { ArrowLeft, Trash2, AlertTriangle, Car } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { todayISO, formatDateBR, saveEndKm } from '@/utils/kmUtils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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
  const [kmDialog, setKmDialog] = useState<{ open: boolean, reservation: any }>({ open: false, reservation: null });
  const [startKm, setStartKm] = useState('');
  const [endKm, setEndKm] = useState('');
  const [isSavingKm, setIsSavingKm] = useState(false);

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

  const openKmDialog = (reservation: any) => {
    setKmDialog({ open: true, reservation });
    setStartKm(reservation.odometer_start_km?.toString() || '');
    setEndKm(reservation.odometer_end_km?.toString() || '');
  };

  const closeKmDialog = () => {
    setKmDialog({ open: false, reservation: null });
    setStartKm('');
    setEndKm('');
  };

  const handleSaveKm = async () => {
    if (!kmDialog.reservation) return;

    const startKmNum = parseInt(startKm);
    const endKmNum = parseInt(endKm);

    if (isNaN(startKmNum) || isNaN(endKmNum)) {
      toast({
        title: 'Erro de validação',
        description: 'Por favor, informe valores numéricos válidos para KM.',
        variant: 'destructive',
      });
      return;
    }

    if (endKmNum < startKmNum) {
      toast({
        title: 'Erro de validação',
        description: 'KM final deve ser maior ou igual ao KM inicial.',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingKm(true);
    try {
      // Atualizar ambos os KMs
      const { error } = await supabase
        .from('reservations')
        .update({ 
          odometer_start_km: startKmNum,
          odometer_end_km: endKmNum,
          status: 'concluída'
        })
        .eq('id', kmDialog.reservation.id);

      if (error) throw error;

      toast({
        title: 'Viagem concluída!',
        description: 'KMs salvos e viagem marcada como concluída.',
      });

      closeKmDialog();
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    } catch (error) {
      console.error('Error saving KM:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Erro ao salvar os KMs. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingKm(false);
    }
  };

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
                                {(r.status === 'ativa' || r.status === 'concluída') && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => openKmDialog(r)}
                                  >
                                    <Car className="h-4 w-4 mr-1" />
                                    {r.odometer_end_km ? 'Ver/Editar KM' : 'Concluir Viagem'}
                                  </Button>
                                )}
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

          {/* Dialog para concluir viagem */}
          <Dialog open={kmDialog.open} onOpenChange={closeKmDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Concluir Viagem</DialogTitle>
                <DialogDescription>
                  Informe os quilômetros para concluir a viagem de {kmDialog.reservation?.driver_name}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">KM Inicial</label>
                  <Input
                    type="number"
                    value={startKm}
                    onChange={(e) => setStartKm(e.target.value)}
                    placeholder="Ex: 50000"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">KM Final</label>
                  <Input
                    type="number"
                    value={endKm}
                    onChange={(e) => setEndKm(e.target.value)}
                    placeholder="Ex: 50150"
                  />
                </div>

                {startKm && endKm && parseInt(endKm) > parseInt(startKm) && (
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm">
                      <strong>Distância percorrida:</strong> {(parseInt(endKm) - parseInt(startKm)).toLocaleString()} km
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={closeKmDialog}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveKm} 
                  disabled={isSavingKm || !startKm || !endKm}
                >
                  {isSavingKm ? 'Salvando...' : 'Concluir Viagem'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </section>
    </main>
  );
};

export default Reservations;
