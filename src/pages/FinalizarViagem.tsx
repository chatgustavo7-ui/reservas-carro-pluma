import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Car, MapPin, User, Calendar, Gauge } from 'lucide-react';
import { formatDateObjectForDisplay } from '@/utils/dateUtils';

interface ActiveReservation {
  id: string;
  start_date: string;
  end_date: string;
  destination: string;
  initial_km?: number;
  cars: {
    id: string;
    plate: string;
    model: string;
    current_km: number;
  };
  conductors: {
    name: string;
    email: string;
  };
}

const FinalizarViagem = () => {
  const [selectedReservation, setSelectedReservation] = useState<string>('');
  const [finalKm, setFinalKm] = useState<string>('');
  const [observations, setObservations] = useState<string>('');
  const [fuelLevel, setFuelLevel] = useState<string>('');
  const [hasIssues, setHasIssues] = useState<boolean>(false);
  const [issueDescription, setIssueDescription] = useState<string>('');

  const queryClient = useQueryClient();

  // Buscar reservas ativas (em andamento)
  const { data: activeReservations, isLoading } = useQuery({
    queryKey: ['active-reservations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          cars (id, plate, model, current_km),
          conductors (name, email)
        `)
        .eq('status', 'in_progress')
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data as ActiveReservation[];
    }
  });

  // Mutation para finalizar viagem
  const finalizeTripMutation = useMutation({
    mutationFn: async (data: {
      reservationId: string;
      finalKm: number;
      observations: string;
      fuelLevel: string;
      hasIssues: boolean;
      issueDescription: string;
    }) => {
      const reservation = activeReservations?.find(r => r.id === data.reservationId);
      if (!reservation) throw new Error('Reserva não encontrada');

      // Validar quilometragem
      if (data.finalKm < reservation.cars.current_km) {
        throw new Error('A quilometragem final não pode ser menor que a atual do veículo');
      }

      const kmTraveled = data.finalKm - reservation.cars.current_km;

      // Atualizar reserva
      const { error: reservationError } = await supabase
        .from('reservations')
        .update({
          status: 'completed',
          end_km: data.finalKm,
          observations: data.observations,
          fuel_level: data.fuelLevel,
          has_issues: data.hasIssues,
          issue_description: data.issueDescription
        })
        .eq('id', data.reservationId);

      if (reservationError) throw reservationError;

      // Registrar quilometragem
      const { error: kmError } = await supabase
        .from('km_records')
        .insert({
          car_id: reservation.cars.id,
          reservation_id: data.reservationId,
          initial_km: reservation.cars.current_km,
          final_km: data.finalKm,
          km_traveled: kmTraveled,
          fuel_level: data.fuelLevel,
          observations: data.observations
        });

      if (kmError) throw kmError;

      // A quilometragem será atualizada automaticamente pelo trigger
      // Não é necessário atualizar manualmente

      // Chamar função para atualizar status do carro (indisponível por 2 dias)
      const { error: functionError } = await supabase.rpc('update_car_post_trip', {
        p_car_id: reservation.cars.id
      });

      if (functionError) throw functionError;

      return data;
    },
    onSuccess: () => {
      toast.success('Viagem finalizada com sucesso!');
      // Invalidar todas as queries relacionadas para atualização imediata
      queryClient.invalidateQueries({ queryKey: ['active-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      queryClient.invalidateQueries({ queryKey: ['car-status'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-usage-stats'] });
      // Limpar formulário
      setSelectedReservation('');
      setFinalKm('');
      setObservations('');
      setFuelLevel('');
      setHasIssues(false);
      setIssueDescription('');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao finalizar viagem: ${error.message}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedReservation) {
      toast.error('Selecione uma reserva');
      return;
    }

    if (!finalKm || isNaN(Number(finalKm))) {
      toast.error('Informe uma quilometragem final válida');
      return;
    }

    if (!fuelLevel) {
      toast.error('Informe o nível de combustível');
      return;
    }

    if (hasIssues && !issueDescription.trim()) {
      toast.error('Descreva os problemas encontrados');
      return;
    }

    finalizeTripMutation.mutate({
      reservationId: selectedReservation,
      finalKm: Number(finalKm),
      observations,
      fuelLevel,
      hasIssues,
      issueDescription
    });
  };

  const selectedReservationData = activeReservations?.find(r => r.id === selectedReservation);

  return (
    <Layout title="Finalizar Viagem">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Finalizar Viagem</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Carregando reservas ativas...</p>
            ) : activeReservations && activeReservations.length > 0 ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Seleção de Reserva */}
                <div>
                  <Label htmlFor="reservation">Selecionar Reserva</Label>
                  <Select value={selectedReservation} onValueChange={setSelectedReservation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha a reserva para finalizar" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeReservations.map((reservation) => (
                        <SelectItem key={reservation.id} value={reservation.id}>
                          {reservation.cars.model} ({reservation.cars.plate}) - {reservation.destination} - {reservation.conductors.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Detalhes da Reserva Selecionada */}
                {selectedReservationData && (
                  <Card className="bg-gray-50">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Car className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="font-medium">{selectedReservationData.cars.model}</p>
                            <p className="text-sm text-gray-500">{selectedReservationData.cars.plate}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="font-medium">{selectedReservationData.conductors.name}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="font-medium">{selectedReservationData.destination}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="font-medium">
                              {formatDateObjectForDisplay(new Date(selectedReservationData.start_date))}
                            </p>
                            <p className="text-sm text-gray-500">
                              até {formatDateObjectForDisplay(new Date(selectedReservationData.end_date))}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 md:col-span-2">
                          <Gauge className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="font-medium">KM Inicial: {selectedReservationData.cars.current_km}</p>
                            <p className="text-sm text-gray-500">KM Atual do Veículo: {selectedReservationData.cars.current_km}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Quilometragem Final */}
                <div>
                  <Label htmlFor="finalKm">Quilometragem Final *</Label>
                  <Input
                    id="finalKm"
                    type="number"
                    value={finalKm}
                    onChange={(e) => setFinalKm(e.target.value)}
                    placeholder="Ex: 45000"
                    min={selectedReservationData?.cars.current_km || 0}
                  />
                  {selectedReservationData && finalKm && (
                    <p className="text-sm text-gray-500 mt-1">
                      KM percorridos: {Number(finalKm) - selectedReservationData.cars.current_km}
                    </p>
                  )}
                </div>

                {/* Nível de Combustível */}
                <div>
                  <Label htmlFor="fuelLevel">Nível de Combustível *</Label>
                  <Select value={fuelLevel} onValueChange={setFuelLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o nível de combustível" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="empty">Vazio</SelectItem>
                      <SelectItem value="quarter">1/4</SelectItem>
                      <SelectItem value="half">1/2</SelectItem>
                      <SelectItem value="three_quarters">3/4</SelectItem>
                      <SelectItem value="full">Cheio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Problemas */}
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      id="hasIssues"
                      checked={hasIssues}
                      onChange={(e) => setHasIssues(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="hasIssues">Houve problemas durante a viagem?</Label>
                  </div>
                  
                  {hasIssues && (
                    <Textarea
                      placeholder="Descreva os problemas encontrados..."
                      value={issueDescription}
                      onChange={(e) => setIssueDescription(e.target.value)}
                      rows={3}
                    />
                  )}
                </div>

                {/* Observações */}
                <div>
                  <Label htmlFor="observations">Observações</Label>
                  <Textarea
                    id="observations"
                    placeholder="Observações adicionais sobre a viagem..."
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={finalizeTripMutation.isPending}
                >
                  {finalizeTripMutation.isPending ? 'Finalizando...' : 'Finalizar Viagem'}
                </Button>
              </form>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Não há viagens ativas para finalizar.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default FinalizarViagem;