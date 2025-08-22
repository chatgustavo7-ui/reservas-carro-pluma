import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Gauge, Car, AlertTriangle, Info } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface KmModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: {
    id: string;
    driver_name: string;
    car: string;
    car_id?: string;
    pickup_date: string;
    return_date: string;
    destinations: string[];
    start_km?: number;
  };
  onSuccess: () => void;
}

const KmModal: React.FC<KmModalProps> = ({ isOpen, onClose, reservation, onSuccess }) => {
  const [finalKm, setFinalKm] = useState<string>('');
  const [fuelLevel, setFuelLevel] = useState<string>('');
  const [observations, setObservations] = useState<string>('');
  const [hasIssues, setHasIssues] = useState<boolean>(false);
  const [issueDescription, setIssueDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [previousKm, setPreviousKm] = useState<number | null>(null);
  const [isLoadingPreviousKm, setIsLoadingPreviousKm] = useState<boolean>(false);

  // Buscar quilometragem anterior do carro
  useEffect(() => {
    const fetchPreviousKm = async () => {
      if (!isOpen || !reservation.car_id) return;
      
      setIsLoadingPreviousKm(true);
      try {
        const { data: carData, error } = await supabase
          .from('cars')
          .select('current_km')
          .eq('id', reservation.car_id)
          .single();

        if (error) {
          console.warn('Erro ao buscar quilometragem anterior:', error);
        } else if (carData) {
          setPreviousKm(carData.current_km);
        }
      } catch (error) {
        console.warn('Erro ao buscar quilometragem anterior:', error);
      } finally {
        setIsLoadingPreviousKm(false);
      }
    };

    fetchPreviousKm();
  }, [isOpen, reservation.car_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!finalKm || isNaN(Number(finalKm))) {
      toast({
        title: 'Erro de validação',
        description: 'Informe uma quilometragem final válida.',
        variant: 'destructive',
      });
      return;
    }

    const finalKmNumber = Number(finalKm);
    const startKm = reservation.start_km || 0;

    if (finalKmNumber < startKm) {
      toast({
        title: 'Erro de validação',
        description: 'A quilometragem final não pode ser menor que a inicial.',
        variant: 'destructive',
      });
      return;
    }

    if (hasIssues && !issueDescription.trim()) {
      toast({
        title: 'Erro de validação',
        description: 'Descreva os problemas encontrados no veículo.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Atualizar a reserva com os dados de conclusão
      const { error: reservationError } = await supabase
        .from('reservations')
        .update({
          status: 'completed',
          end_km: finalKmNumber
        })
        .eq('id', reservation.id);

      if (reservationError) throw reservationError;

      // Buscar o car_id da reserva se não estiver disponível
      let carId = reservation.car_id;
      if (!carId) {
        const { data: reservationData, error: reservationFetchError } = await supabase
          .from('reservations')
          .select('car_id')
          .eq('id', reservation.id)
          .single();

        if (reservationFetchError) {
          console.warn('Não foi possível buscar car_id da reserva:', reservationFetchError);
        } else {
          carId = reservationData.car_id;
        }
      }

      if (carId) {
        // Atualizar a quilometragem atual do carro
        const { error: carUpdateError } = await supabase
          .from('cars')
          .update({ current_km: finalKmNumber })
          .eq('id', carId);

        if (carUpdateError) {
          console.warn('Erro ao atualizar quilometragem do carro:', carUpdateError);
        }

        // Chamar a função RPC para atualizar o status do carro
        const { error: rpcError } = await supabase
          .rpc('update_car_post_trip', {
            p_car_id: carId
          });

        if (rpcError) {
          console.warn('Erro ao atualizar status do carro:', rpcError);
        }
      } else {
        console.warn('Não foi possível obter car_id para atualizar o status do carro');
      }

      toast({
        title: 'Viagem concluída',
        description: `Viagem finalizada com sucesso. KM percorridos: ${finalKmNumber - startKm}`,
      });

      onSuccess();
      onClose();
      
      // Resetar formulário
      setFinalKm('');
      setFuelLevel('');
      setObservations('');
      setHasIssues(false);
      setIssueDescription('');
      
    } catch (error) {
      console.error('Erro ao concluir viagem:', error);
      toast({
        title: 'Erro ao concluir',
        description: 'Ocorreu um erro ao finalizar a viagem. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      // Resetar formulário ao fechar
      setFinalKm('');
      setFuelLevel('');
      setObservations('');
      setHasIssues(false);
      setIssueDescription('');
    }
  };

  const kmTraveled = finalKm && !isNaN(Number(finalKm)) 
    ? Number(finalKm) - (reservation.start_km || 0)
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Finalizar Viagem
          </DialogTitle>
          <DialogDescription>
            Registre a quilometragem final e informações da devolução do veículo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Informações da Reserva */}
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-gray-500" />
              <span className="font-medium">{reservation.car}</span>
            </div>
            <div className="text-sm text-gray-600">
              <strong>Condutor:</strong> {reservation.driver_name}
            </div>
            <div className="text-sm text-gray-600">
              <strong>Destinos:</strong> {reservation.destinations.join(', ')}
            </div>
            {reservation.start_km && (
              <div className="text-sm text-gray-600">
                <strong>KM Inicial:</strong> {reservation.start_km.toLocaleString()}
              </div>
            )}
          </div>

          {/* Quilometragem Anterior e Final */}
          <div className="space-y-3">
            {/* Quilometragem Anterior */}
            {previousKm !== null && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <Info className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Quilometragem Anterior</span>
                </div>
                <p className="text-lg font-semibold text-blue-900">
                  {previousKm.toLocaleString()} km
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Use este valor como referência para inserir a quilometragem atual
                </p>
              </div>
            )}
            
            {isLoadingPreviousKm && (
              <div className="bg-gray-50 p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-600">Carregando quilometragem anterior...</span>
                </div>
              </div>
            )}

            {/* Quilometragem Final */}
            <div className="space-y-2">
              <Label htmlFor="finalKm">Quilometragem Total do Carro *</Label>
              <Input
                id="finalKm"
                type="number"
                value={finalKm}
                onChange={(e) => setFinalKm(e.target.value)}
                placeholder={previousKm ? `Ex: ${(previousKm + 100).toLocaleString()} (quilometragem atual do odômetro)` : "Ex: 45000 (quilometragem total do odômetro)"}
                min={previousKm || reservation.start_km || 0}
                required
              />
              {kmTraveled > 0 && (
                <p className="text-sm text-green-600">
                  KM percorridos: {kmTraveled.toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* Nível de Combustível */}
          <div className="space-y-2">
            <Label htmlFor="fuelLevel">Nível de Combustível</Label>
            <Select value={fuelLevel} onValueChange={setFuelLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o nível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vazio">Vazio</SelectItem>
                <SelectItem value="1/4">1/4</SelectItem>
                <SelectItem value="1/2">1/2</SelectItem>
                <SelectItem value="3/4">3/4</SelectItem>
                <SelectItem value="cheio">Cheio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Problemas no Veículo */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasIssues"
                checked={hasIssues}
                onCheckedChange={(checked) => setHasIssues(checked as boolean)}
              />
              <Label htmlFor="hasIssues" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Problemas encontrados no veículo
              </Label>
            </div>
            {hasIssues && (
              <Textarea
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                placeholder="Descreva os problemas encontrados..."
                required={hasIssues}
              />
            )}
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observations">Observações</Label>
            <Textarea
              id="observations"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Observações adicionais sobre a viagem..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Finalizando...' : 'Finalizar Viagem'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default KmModal;