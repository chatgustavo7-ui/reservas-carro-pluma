import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CarWithLastUse } from '@/hooks/useCarStatus';
import { toast } from 'sonner';
import { supabase } from '../integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Car, RotateCcw, Wrench, Droplets, AlertTriangle, CheckCircle } from 'lucide-react';

interface EditCarModalProps {
  car: CarWithLastUse | null;
  isOpen: boolean;
  onClose: () => void;
}

const CAR_STATUS_OPTIONS = [
  { value: 'disponível', label: 'Disponível' },
  { value: 'em uso', label: 'Em Uso' },
  { value: 'indisponível', label: 'Indisponível' },
  { value: 'lavar', label: 'Lavar' },
  { value: 'manutenção', label: 'Manutenção' }
];

export function EditCarModal({ car, isOpen, onClose }: EditCarModalProps) {
  // Estados para todos os campos editáveis
  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('');
  const [brand, setBrand] = useState('');
  const [color, setColor] = useState('');
  const [year, setYear] = useState('');
  const [currentKm, setCurrentKm] = useState('');
  const [lastRevisionKm, setLastRevisionKm] = useState('');
  const [nextRevisionKm, setNextRevisionKm] = useState('');
  const [nextMaintenanceKm, setNextMaintenanceKm] = useState('');
  const [status, setStatus] = useState('');
  const [lastMaintenance, setLastMaintenance] = useState('');
  const [observations, setObservations] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (car) {
      setPlate(car.plate || '');
      setModel(car.model || '');
      setBrand(car.brand || '');
      setColor(car.color || '');
      setYear(car.year?.toString() || '');
      setCurrentKm(car.current_km?.toString() || '');
      setLastRevisionKm(car.last_revision_km?.toString() || '');
      setNextRevisionKm(car.next_revision_km?.toString() || '');
      setNextMaintenanceKm(car.next_maintenance_km?.toString() || '');
      setStatus(car.status || '');
      setLastMaintenance(car.last_maintenance || '');
      setObservations(car.observations || '');
    }
  }, [car]);

  // Função para validar campos numéricos
  const validateNumericField = (value: string, fieldName: string, allowEmpty = false) => {
    if (allowEmpty && value === '') return null;
    const num = parseInt(value);
    if (isNaN(num) || num < 0) {
      toast.error(`${fieldName} deve ser um número válido`);
      return false;
    }
    return num;
  };

  // Função principal de salvamento
  const handleSave = async () => {
    if (!car) return;

    // Validações básicas
    if (!plate.trim()) {
      toast.error('Placa é obrigatória');
      return;
    }
    if (!model.trim()) {
      toast.error('Modelo é obrigatório');
      return;
    }
    if (!brand.trim()) {
      toast.error('Marca é obrigatória');
      return;
    }
    if (!status) {
      toast.error('Status é obrigatório');
      return;
    }

    // Validações numéricas
    const newKm = validateNumericField(currentKm, 'Quilometragem atual', true);
    const newYear = validateNumericField(year, 'Ano');
    const newLastRevisionKm = validateNumericField(lastRevisionKm, 'Quilometragem da última revisão');
    const newNextRevisionKm = validateNumericField(nextRevisionKm, 'Próxima revisão');
    const newNextMaintenanceKm = validateNumericField(nextMaintenanceKm, 'Próxima manutenção');
    
    if (newKm === false || newYear === false || newLastRevisionKm === false || 
        newNextRevisionKm === false || newNextMaintenanceKm === false) {
      return;
    }

    // Validação de quilometragem não pode diminuir
    if (car.current_km && newKm && newKm < car.current_km) {
      toast.error('Nova quilometragem não pode ser menor que a atual');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('cars')
        .update({
          plate: plate.trim(),
          model: model.trim(),
          brand: brand.trim(),
          color: color.trim() || null,
          year: newYear,
          current_km: newKm,
          last_revision_km: newLastRevisionKm,
          next_revision_km: newNextRevisionKm,
          next_maintenance_km: newNextMaintenanceKm,
          status,
          last_maintenance: lastMaintenance || null,
          observations: observations.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', car.id);

      if (error) {
        console.error('Erro ao atualizar carro:', error);
        toast.error('Erro ao salvar alterações');
        return;
      }

      toast.success('Dados do carro atualizados com sucesso!');
      
      // Invalidar queries para atualizar a interface
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === 'car-status'
      });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      
      onClose();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar alterações');
    } finally {
      setIsLoading(false);
    }
  };

  // Função para ações rápidas de status
  const handleQuickStatusChange = async (newStatus: string) => {
    if (!car) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('cars')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', car.id);

      if (error) {
        console.error('Erro ao atualizar status:', error);
        toast.error('Erro ao atualizar status');
        return;
      }

      setStatus(newStatus);
      toast.success(`Status alterado para: ${newStatus}`);
      
      // Invalidar queries
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === 'car-status'
      });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setIsLoading(false);
    }
  };

  // Função para reset completo do carro
  const handleResetCar = async () => {
    if (!car) return;
    
    if (!confirm('Tem certeza que deseja resetar completamente este carro? Isso irá zerar a quilometragem e definir como disponível.')) {
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('cars')
        .update({
          current_km: null,
          status: 'disponível',
          last_maintenance: null,
          observations: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', car.id);

      if (error) {
        console.error('Erro ao resetar carro:', error);
        toast.error('Erro ao resetar carro');
        return;
      }

      // Atualizar estados locais
      setCurrentKm('');
      setStatus('disponível');
      setLastMaintenance('');
      setObservations('');
      
      toast.success('Carro resetado com sucesso!');
      
      // Invalidar queries
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === 'car-status'
      });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      
    } catch (error) {
      console.error('Erro ao resetar carro:', error);
      toast.error('Erro ao resetar carro');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (car) {
      setPlate(car.plate || '');
      setModel(car.model || '');
      setBrand(car.brand || '');
      setColor(car.color || '');
      setYear(car.year?.toString() || '');
      setCurrentKm(car.current_km?.toString() || '');
      setLastRevisionKm(car.last_revision_km?.toString() || '');
      setNextRevisionKm(car.next_revision_km?.toString() || '');
      setNextMaintenanceKm(car.next_maintenance_km?.toString() || '');
      setStatus(car.status || '');
      setLastMaintenance(car.last_maintenance || '');
      setObservations(car.observations || '');
    }
    onClose();
  };

  if (!car) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Painel Administrativo - {car?.model} ({car?.plate})
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Botões de Ação Rápida */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Ações Rápidas de Status</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={status === 'disponível' ? 'default' : 'outline'}
                onClick={() => handleQuickStatusChange('disponível')}
                disabled={isLoading}
                className="flex items-center gap-1"
              >
                <CheckCircle className="h-4 w-4" />
                Disponível
              </Button>
              <Button
                size="sm"
                variant={status === 'manutenção' ? 'default' : 'outline'}
                onClick={() => handleQuickStatusChange('manutenção')}
                disabled={isLoading}
                className="flex items-center gap-1"
              >
                <Wrench className="h-4 w-4" />
                Manutenção
              </Button>
              <Button
                size="sm"
                variant={status === 'lavar' ? 'default' : 'outline'}
                onClick={() => handleQuickStatusChange('lavar')}
                disabled={isLoading}
                className="flex items-center gap-1"
              >
                <Droplets className="h-4 w-4" />
                Lavar
              </Button>
              <Button
                size="sm"
                variant={status === 'indisponível' ? 'default' : 'outline'}
                onClick={() => handleQuickStatusChange('indisponível')}
                disabled={isLoading}
                className="flex items-center gap-1"
              >
                <AlertTriangle className="h-4 w-4" />
                Indisponível
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleResetCar}
                disabled={isLoading}
                className="flex items-center gap-1"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Completo
              </Button>
            </div>
          </div>

          <Separator />

          {/* Informações Básicas */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold">Informações Básicas</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plate">Placa *</Label>
                <Input
                  id="plate"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  placeholder="ABC-1234"
                  maxLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Modelo *</Label>
                <Input
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="T-Cross"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Marca *</Label>
                <Input
                  id="brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Volkswagen"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Cor</Label>
                <Input
                  id="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="Branco"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Ano *</Label>
                <Input
                  id="year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2023"
                  min="1990"
                  max="2030"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    {CAR_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Quilometragem e Manutenção */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold">Quilometragem e Manutenção</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentKm">Quilometragem Atual</Label>
                <Input
                  id="currentKm"
                  type="number"
                  value={currentKm}
                  onChange={(e) => setCurrentKm(e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastRevisionKm">Última Revisão (km) *</Label>
                <Input
                  id="lastRevisionKm"
                  type="number"
                  value={lastRevisionKm}
                  onChange={(e) => setLastRevisionKm(e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nextRevisionKm">Próxima Revisão (km) *</Label>
                <Input
                  id="nextRevisionKm"
                  type="number"
                  value={nextRevisionKm}
                  onChange={(e) => setNextRevisionKm(e.target.value)}
                  placeholder="10000"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nextMaintenanceKm">Próxima Manutenção (km) *</Label>
                <Input
                  id="nextMaintenanceKm"
                  type="number"
                  value={nextMaintenanceKm}
                  onChange={(e) => setNextMaintenanceKm(e.target.value)}
                  placeholder="10000"
                  min="0"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="lastMaintenance">Data da Última Manutenção</Label>
                <Input
                  id="lastMaintenance"
                  type="date"
                  value={lastMaintenance}
                  onChange={(e) => setLastMaintenance(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observations">Observações</Label>
            <Textarea
              id="observations"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Observações sobre o carro, problemas, características especiais..."
              rows={4}
            />
          </div>

          {/* Status Atual */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <Badge variant={status === 'disponível' ? 'default' : status === 'manutenção' ? 'destructive' : 'secondary'}>
              {status || 'Sem status'}
            </Badge>
            <span className="text-sm text-gray-600">
              Quilometragem: {currentKm ? `${parseInt(currentKm).toLocaleString()} km` : 'Não definida'}
            </span>
          </div>
        </div>
        
        <DialogFooter className="flex gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button 
            type="button" 
            onClick={handleSave}
            disabled={isLoading}
            className="min-w-[100px]"
          >
            {isLoading ? 'Salvando...' : 'Salvar Tudo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}