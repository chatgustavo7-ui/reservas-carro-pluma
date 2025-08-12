import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DestinationAutocomplete } from '@/components/DestinationAutocomplete';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';

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
      }>;
    },
  });
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const variant = status === 'ativa' ? 'default' : status === 'concluída' ? 'secondary' : 'destructive';
  return <Badge variant={variant as any}>{status}</Badge>;
};

const Reservations: React.FC = () => {
  const [driver, setDriver] = useState('');
  const [car, setCar] = useState('');
  const [destination, setDestination] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const { data, isLoading, error, refetch } = useReservations({ driver, car, destination, start, end });

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
                      <TableHead>Acompanhantes</TableHead>
                      <TableHead>Carro</TableHead>
                      <TableHead>Retirada</TableHead>
                      <TableHead>Devolução</TableHead>
                      <TableHead>Destinos</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data && data.length > 0 ? (
                      data.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.driver_name}</TableCell>
                          <TableCell>{(r.companions || []).join(', ') || '-'}</TableCell>
                          <TableCell>{r.car}</TableCell>
                          <TableCell>{r.pickup_date ? format(new Date(r.pickup_date), 'dd/MM/yyyy') : '-'}</TableCell>
                          <TableCell>{r.return_date ? format(new Date(r.return_date), 'dd/MM/yyyy') : '-'}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(r.destinations || []).map((d, i) => (
                                <Badge key={`${r.id}-${i}`} variant="secondary">{d}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell><StatusBadge status={r.status} /></TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
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
