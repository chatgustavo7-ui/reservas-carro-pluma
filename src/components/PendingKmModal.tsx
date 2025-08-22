import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { getPendingReservations, saveEndKm, formatDateBR } from "@/utils/kmUtils";
import { useToast } from "@/hooks/use-toast";

interface PendingKmModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverName: string;
}

interface PendingReservation {
  id: string;
  car: string;
  pickup_date: string;
  return_date: string;
  destinations: string[];
  start_km?: number;
}

export const PendingKmModal = ({ isOpen, onClose, driverName }: PendingKmModalProps) => {
  const [pendingReservations, setPendingReservations] = useState<PendingReservation[]>([]);
  const [kmValues, setKmValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && driverName) {
      loadPendingReservations();
    }
  }, [isOpen, driverName, loadPendingReservations]);

  const loadPendingReservations = useCallback(async () => {
    setLoading(true);
    try {
      const reservations = await getPendingReservations(driverName);
      setPendingReservations(reservations);
      
      // Inicializar valores de KM vazios
      const initialValues: Record<string, string> = {};
      reservations.forEach(reservation => {
        initialValues[reservation.id] = '';
      });
      setKmValues(initialValues);
    } catch (error) {
      console.error('Error loading pending reservations:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar reservas pendentes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [driverName, toast]);

  const handleKmChange = (reservationId: string, value: string) => {
    setKmValues(prev => ({
      ...prev,
      [reservationId]: value
    }));
  };

  const validateKm = (reservationId: string, kmValue: string): string | null => {
    const km = parseInt(kmValue);
    
    if (isNaN(km) || km < 0) {
      return "O KM deve ser um número inteiro válido e não pode ser negativo";
    }

    const reservation = pendingReservations.find(r => r.id === reservationId);
    if (reservation?.start_km && km < reservation.start_km) {
      return `O KM da devolução (${km}) não pode ser menor que o KM da retirada (${reservation.start_km})`;
    }

    return null;
  };

  const canSave = () => {
    return pendingReservations.every(reservation => {
      const kmValue = kmValues[reservation.id];
      return kmValue && !validateKm(reservation.id, kmValue);
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [];
      
      for (const reservation of pendingReservations) {
        const kmValue = kmValues[reservation.id];
        const validation = validateKm(reservation.id, kmValue);
        
        if (validation) {
          toast({
            title: "Erro de validação",
            description: validation,
            variant: "destructive",
          });
          setSaving(false);
          return;
        }

        updates.push(saveEndKm(reservation.id, parseInt(kmValue)));
      }

      const results = await Promise.all(updates);
      const hasErrors = results.some(result => result.error);

      if (hasErrors) {
        toast({
          title: "Erro",
          description: "Erro ao salvar alguns valores de KM",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sucesso",
          description: "KM registrado com sucesso",
        });
        onClose();
      }
    } catch (error) {
      console.error('Error saving KM values:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar os valores de KM",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Informar KM da devolução</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Carregando reservas pendentes...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingReservations.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma reserva pendente encontrada.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Informe o KM da devolução para as seguintes reservas:
                </p>
                
                {pendingReservations.map((reservation) => (
                  <Card key={reservation.id}>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{reservation.car}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatDateBR(reservation.pickup_date)} até {formatDateBR(reservation.return_date)}
                          </span>
                        </div>
                        
                        <div className="text-sm">
                          <strong>Destinos:</strong> {reservation.destinations.join(', ')}
                        </div>
                        
                        {reservation.start_km && (
                          <div className="text-sm">
                            <strong>KM na retirada:</strong> {reservation.start_km.toLocaleString()}
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <Label htmlFor={`km-${reservation.id}`}>
                            KM da devolução *
                          </Label>
                          <Input
                            id={`km-${reservation.id}`}
                            type="number"
                            min="0"
                            placeholder="Digite o KM da devolução"
                            value={kmValues[reservation.id] || ''}
                            onChange={(e) => handleKmChange(reservation.id, e.target.value)}
                          />
                          {kmValues[reservation.id] && validateKm(reservation.id, kmValues[reservation.id]) && (
                            <p className="text-sm text-destructive">
                              {validateKm(reservation.id, kmValues[reservation.id])}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!canSave() || saving || pendingReservations.length === 0}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};