import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { useOilCoolantAlerts, MaintenanceType, VehicleMaintenanceConfig, MaintenanceHistory } from '../hooks/useOilCoolantAlerts';
import { supabase } from '../integrations/supabase/client';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  Car, 
  Wrench, 
  Droplets,
  AlertTriangle,
  CheckCircle,
  Info,
  Plus,
  History,
  Calendar,
  DollarSign,
  User,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

interface Car {
  id: string;
  plate: string;
  model: string;
  brand: string;
}

const MaintenanceConfigAdmin: React.FC = () => {
  const {
    maintenanceTypes,
    loading,
    error,
    fetchMaintenanceTypes,
    getVehicleMaintenanceConfig,
    updateMaintenanceConfig,
    registerMaintenance,
    getMaintenanceHistory
  } = useOilCoolantAlerts();

  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCarId, setSelectedCarId] = useState<string>('');
  const [vehicleConfigs, setVehicleConfigs] = useState<VehicleMaintenanceConfig[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceHistory[]>([]);
  const [loadingCars, setLoadingCars] = useState(true);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Estados para o formulário de registro de manutenção
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    maintenanceTypeId: '',
    maintenanceDate: new Date().toISOString().split('T')[0],
    kmAtMaintenance: 0,
    description: '',
    cost: 0,
    performedBy: '',
    notes: ''
  });

  // Buscar lista de carros
  const fetchCars = async () => {
    try {
      setLoadingCars(true);
      const { data, error } = await supabase
        .from('cars')
        .select('id, plate, model, brand')
        .order('plate');

      if (error) throw error;
      setCars(data || []);
      
      if (data && data.length > 0 && !selectedCarId) {
        setSelectedCarId(data[0].id);
      }
    } catch (err) {
      console.error('Erro ao buscar carros:', err);
      toast.error('Erro ao carregar lista de veículos');
    } finally {
      setLoadingCars(false);
    }
  };

  // Buscar configurações do veículo selecionado
  const fetchVehicleConfigs = async (carId: string) => {
    if (!carId) return;
    
    try {
      setLoadingConfigs(true);
      const configs = await getVehicleMaintenanceConfig(carId);
      setVehicleConfigs(configs);
    } catch (err) {
      console.error('Erro ao buscar configurações:', err);
      toast.error('Erro ao carregar configurações do veículo');
    } finally {
      setLoadingConfigs(false);
    }
  };

  // Atualizar configuração específica
  const handleConfigUpdate = async (
    maintenanceTypeId: string,
    kmInterval: number,
    timeIntervalMonths: number,
    isEnabled: boolean
  ) => {
    if (!selectedCarId) return;

    try {
      setSaving(true);
      await updateMaintenanceConfig(
        selectedCarId,
        maintenanceTypeId,
        kmInterval,
        timeIntervalMonths,
        isEnabled
      );
      
      // Recarregar configurações
      await fetchVehicleConfigs(selectedCarId);
      toast.success('Configuração atualizada com sucesso!');
    } catch (err) {
      console.error('Erro ao atualizar configuração:', err);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  // Resetar para configuração padrão
  const handleResetToDefault = async (maintenanceTypeId: string) => {
    const maintenanceType = maintenanceTypes.find(mt => mt.id === maintenanceTypeId);
    if (!maintenanceType || !selectedCarId) return;

    await handleConfigUpdate(
      maintenanceTypeId,
      maintenanceType.default_km_interval,
      maintenanceType.default_time_interval_months,
      true
    );
  };

  // Buscar histórico de manutenções
  const fetchMaintenanceHistory = async (carId?: string) => {
    try {
      setLoadingHistory(true);
      const history = await getMaintenanceHistory(carId);
      setMaintenanceHistory(history);
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
      toast.error('Erro ao carregar histórico de manutenções');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Registrar nova manutenção
  const handleRegisterMaintenance = async () => {
    if (!selectedCarId || !registerForm.maintenanceTypeId) {
      toast.error('Selecione um veículo e tipo de manutenção');
      return;
    }

    try {
      setSaving(true);
      await registerMaintenance(
        selectedCarId,
        registerForm.maintenanceTypeId,
        registerForm.maintenanceDate,
        registerForm.kmAtMaintenance,
        registerForm.description || undefined,
        registerForm.cost || undefined,
        registerForm.performedBy || undefined,
        registerForm.notes || undefined
      );
      
      // Resetar formulário
      setRegisterForm({
        maintenanceTypeId: '',
        maintenanceDate: new Date().toISOString().split('T')[0],
        kmAtMaintenance: 0,
        description: '',
        cost: 0,
        performedBy: '',
        notes: ''
      });
      
      setIsRegisterDialogOpen(false);
      
      // Recarregar dados
      await fetchVehicleConfigs(selectedCarId);
      await fetchMaintenanceHistory(selectedCarId);
      
      toast.success('Manutenção registrada com sucesso!');
    } catch (err) {
      console.error('Erro ao registrar manutenção:', err);
      toast.error('Erro ao registrar manutenção');
    } finally {
      setSaving(false);
    }
  };

  // Obter quilometragem atual do veículo
  const getCurrentKm = async (carId: string) => {
    try {
      const { data, error } = await supabase
        .from('cars')
        .select('current_km')
        .eq('id', carId)
        .single();
      
      if (error) throw error;
      return data?.current_km || 0;
    } catch (err) {
      console.error('Erro ao buscar KM atual:', err);
      return 0;
    }
  };

  // Obter configuração atual ou padrão
  const getCurrentConfig = (maintenanceTypeId: string) => {
    const config = vehicleConfigs.find(vc => vc.maintenance_type_id === maintenanceTypeId);
    const maintenanceType = maintenanceTypes.find(mt => mt.id === maintenanceTypeId);
    
    if (config) {
      return {
        kmInterval: config.km_interval,
        timeIntervalMonths: config.time_interval_months,
        isEnabled: config.is_enabled
      };
    }
    
    if (maintenanceType) {
      return {
        kmInterval: maintenanceType.default_km_interval,
        timeIntervalMonths: maintenanceType.default_time_interval_months,
        isEnabled: true
      };
    }
    
    return {
      kmInterval: 0,
      timeIntervalMonths: 0,
      isEnabled: false
    };
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'oil':
        return <Droplets className="h-4 w-4 text-amber-600" />;
      case 'coolant':
        return <Droplets className="h-4 w-4 text-blue-600" />;
      default:
        return <Wrench className="h-4 w-4 text-gray-600" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'oil':
        return 'Óleo';
      case 'coolant':
        return 'Fluido de Arrefecimento';
      default:
        return 'Geral';
    }
  };

  useEffect(() => {
    fetchCars();
    fetchMaintenanceTypes();
  }, []);

  useEffect(() => {
    if (selectedCarId) {
      fetchVehicleConfigs(selectedCarId);
      fetchMaintenanceHistory(selectedCarId);
      
      // Preencher KM atual no formulário
      getCurrentKm(selectedCarId).then(km => {
        setRegisterForm(prev => ({ ...prev, kmAtMaintenance: km }));
      });
    } else {
      setVehicleConfigs([]);
      setMaintenanceHistory([]);
    }
  }, [selectedCarId]);

  if (loading || loadingCars) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar dados: {error}
        </AlertDescription>
      </Alert>
    );
  }

  const selectedCar = cars.find(car => car.id === selectedCarId);
  const oilTypes = maintenanceTypes.filter(mt => mt.category === 'oil');
  const coolantTypes = maintenanceTypes.filter(mt => mt.category === 'coolant');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuração de Manutenção
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Seleção de Veículo */}
            <div className="space-y-2">
              <Label htmlFor="car-select">Selecionar Veículo</Label>
              <Select value={selectedCarId} onValueChange={setSelectedCarId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um veículo" />
                </SelectTrigger>
                <SelectContent>
                  {cars.map((car) => (
                    <SelectItem key={car.id} value={car.id}>
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        {car.plate} - {car.brand} {car.model}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCar && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    {selectedCar.plate} - {selectedCar.brand} {selectedCar.model}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedCarId && (
        <Tabs defaultValue="oil" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="oil" className="flex items-center gap-2">
              <Droplets className="h-4 w-4" />
              Óleo ({oilTypes.length})
            </TabsTrigger>
            <TabsTrigger value="coolant" className="flex items-center gap-2">
              <Droplets className="h-4 w-4" />
              Fluido ({coolantTypes.length})
            </TabsTrigger>
            <TabsTrigger value="register" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Registrar
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="oil">
            <div className="space-y-4">
              {oilTypes.map((maintenanceType) => {
                const config = getCurrentConfig(maintenanceType.id);
                return (
                  <MaintenanceTypeConfig
                    key={maintenanceType.id}
                    maintenanceType={maintenanceType}
                    config={config}
                    onUpdate={(kmInterval, timeIntervalMonths, isEnabled) =>
                      handleConfigUpdate(maintenanceType.id, kmInterval, timeIntervalMonths, isEnabled)
                    }
                    onReset={() => handleResetToDefault(maintenanceType.id)}
                    saving={saving}
                    loadingConfigs={loadingConfigs}
                  />
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="coolant">
            <div className="space-y-4">
              {coolantTypes.map((maintenanceType) => {
                const config = getCurrentConfig(maintenanceType.id);
                return (
                  <MaintenanceTypeConfig
                    key={maintenanceType.id}
                    maintenanceType={maintenanceType}
                    config={config}
                    onUpdate={(kmInterval, timeIntervalMonths, isEnabled) =>
                      handleConfigUpdate(maintenanceType.id, kmInterval, timeIntervalMonths, isEnabled)
                    }
                    onReset={() => handleResetToDefault(maintenanceType.id)}
                    saving={saving}
                    loadingConfigs={loadingConfigs}
                  />
                );
              })}
            </div>
          </TabsContent>

          {/* Aba de Registro de Manutenção */}
          <TabsContent value="register" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Registrar Manutenção</h3>
              <Button 
                onClick={() => setIsRegisterDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nova Manutenção
              </Button>
            </div>
            
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">
                  Registre as manutenções realizadas para manter o histórico atualizado e evitar alertas desnecessários.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba de Histórico */}
          <TabsContent value="history" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Histórico de Manutenções</h3>
              <Button 
                variant="outline" 
                onClick={() => fetchMaintenanceHistory(selectedCarId)}
                disabled={loadingHistory}
              >
                {loadingHistory ? 'Carregando...' : 'Atualizar'}
              </Button>
            </div>
            
            {loadingHistory ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">Carregando histórico...</p>
                </CardContent>
              </Card>
            ) : maintenanceHistory.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">
                    Nenhuma manutenção registrada para este veículo.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {maintenanceHistory.map((maintenance) => {
                  const maintenanceType = maintenanceTypes.find(mt => mt.id === maintenance.maintenance_type_id);
                  return (
                    <Card key={maintenance.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {maintenanceType?.name || 'Tipo desconhecido'}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {new Date(maintenance.date_performed).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>KM: {maintenance.km_at_maintenance?.toLocaleString() || 'N/A'}</span>
                              </div>
                              
                              {maintenance.cost && (
                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                                  <span>R$ {maintenance.cost.toFixed(2)}</span>
                                </div>
                              )}
                              
                              {maintenance.performed_by && (
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span>{maintenance.performed_by}</span>
                                </div>
                              )}
                              
                              {maintenance.description && (
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span>{maintenance.description}</span>
                                </div>
                              )}
                            </div>
                            
                            {maintenance.notes && (
                              <div className="mt-2 p-2 bg-muted rounded text-sm">
                                <strong>Observações:</strong> {maintenance.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
      
      {/* Dialog para registrar manutenção */}
      <Dialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Manutenção</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Tipo de Manutenção</label>
              <Select 
                value={registerForm.maintenanceTypeId} 
                onValueChange={(value) => setRegisterForm(prev => ({ ...prev, maintenanceTypeId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {maintenanceTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Data da Manutenção</label>
              <Input
                type="date"
                value={registerForm.maintenanceDate}
                onChange={(e) => setRegisterForm(prev => ({ ...prev, maintenanceDate: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Quilometragem</label>
              <Input
                type="number"
                value={registerForm.kmAtMaintenance}
                onChange={(e) => setRegisterForm(prev => ({ ...prev, kmAtMaintenance: parseInt(e.target.value) || 0 }))}
                placeholder="KM atual do veículo"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Descrição (opcional)</label>
              <Input
                value={registerForm.description}
                onChange={(e) => setRegisterForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Ex: Troca de óleo 5W30"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Custo (opcional)</label>
              <Input
                type="number"
                step="0.01"
                value={registerForm.cost}
                onChange={(e) => setRegisterForm(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Realizado por (opcional)</label>
              <Input
                value={registerForm.performedBy}
                onChange={(e) => setRegisterForm(prev => ({ ...prev, performedBy: e.target.value }))}
                placeholder="Nome da oficina ou mecânico"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Observações (opcional)</label>
              <Textarea
                value={registerForm.notes}
                onChange={(e) => setRegisterForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Observações adicionais..."
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setIsRegisterDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleRegisterMaintenance}
              disabled={saving || !registerForm.maintenanceTypeId}
            >
              {saving ? 'Salvando...' : 'Registrar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Componente para configuração individual de tipo de manutenção
interface MaintenanceTypeConfigProps {
  maintenanceType: MaintenanceType;
  config: {
    kmInterval: number;
    timeIntervalMonths: number;
    isEnabled: boolean;
  };
  onUpdate: (kmInterval: number, timeIntervalMonths: number, isEnabled: boolean) => void;
  onReset: () => void;
  saving: boolean;
  loadingConfigs: boolean;
}

const MaintenanceTypeConfig: React.FC<MaintenanceTypeConfigProps> = ({
  maintenanceType,
  config,
  onUpdate,
  onReset,
  saving,
  loadingConfigs
}) => {
  const [kmInterval, setKmInterval] = useState(config.kmInterval);
  const [timeIntervalMonths, setTimeIntervalMonths] = useState(config.timeIntervalMonths);
  const [isEnabled, setIsEnabled] = useState(config.isEnabled);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setKmInterval(config.kmInterval);
    setTimeIntervalMonths(config.timeIntervalMonths);
    setIsEnabled(config.isEnabled);
    setHasChanges(false);
  }, [config]);

  useEffect(() => {
    const changed = 
      kmInterval !== config.kmInterval ||
      timeIntervalMonths !== config.timeIntervalMonths ||
      isEnabled !== config.isEnabled;
    setHasChanges(changed);
  }, [kmInterval, timeIntervalMonths, isEnabled, config]);

  const handleSave = () => {
    onUpdate(kmInterval, timeIntervalMonths, isEnabled);
  };

  const isKmValid = kmInterval >= maintenanceType.min_km_interval && kmInterval <= maintenanceType.max_km_interval;
  const isTimeValid = timeIntervalMonths >= maintenanceType.min_time_interval_months && timeIntervalMonths <= maintenanceType.max_time_interval_months;
  const canSave = isKmValid && isTimeValid && hasChanges && !saving;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'oil':
        return <Droplets className="h-4 w-4 text-amber-600" />;
      case 'coolant':
        return <Droplets className="h-4 w-4 text-blue-600" />;
      default:
        return <Wrench className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loadingConfigs) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getCategoryIcon(maintenanceType.category)}
            {maintenanceType.name}
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="secondary">
                <Info className="h-3 w-3 mr-1" />
                Alterações pendentes
              </Badge>
            )}
            <Switch
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
              disabled={saving}
            />
          </div>
        </CardTitle>
        {maintenanceType.description && (
          <p className="text-sm text-gray-600">{maintenanceType.description}</p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Intervalo de Quilometragem */}
          <div className="space-y-2">
            <Label htmlFor={`km-${maintenanceType.id}`}>Intervalo de KM</Label>
            <Input
              id={`km-${maintenanceType.id}`}
              type="number"
              value={kmInterval}
              onChange={(e) => setKmInterval(parseInt(e.target.value) || 0)}
              disabled={!isEnabled || saving}
              min={maintenanceType.min_km_interval}
              max={maintenanceType.max_km_interval}
              className={!isKmValid ? 'border-red-500' : ''}
            />
            <p className="text-xs text-gray-500">
              Mín: {maintenanceType.min_km_interval.toLocaleString()} km | 
              Máx: {maintenanceType.max_km_interval.toLocaleString()} km |
              Padrão: {maintenanceType.default_km_interval.toLocaleString()} km
            </p>
            {!isKmValid && (
              <p className="text-xs text-red-600">
                Valor deve estar entre {maintenanceType.min_km_interval.toLocaleString()} e {maintenanceType.max_km_interval.toLocaleString()} km
              </p>
            )}
          </div>

          {/* Intervalo de Tempo */}
          <div className="space-y-2">
            <Label htmlFor={`time-${maintenanceType.id}`}>Intervalo de Tempo (meses)</Label>
            <Input
              id={`time-${maintenanceType.id}`}
              type="number"
              value={timeIntervalMonths}
              onChange={(e) => setTimeIntervalMonths(parseInt(e.target.value) || 0)}
              disabled={!isEnabled || saving}
              min={maintenanceType.min_time_interval_months}
              max={maintenanceType.max_time_interval_months}
              className={!isTimeValid ? 'border-red-500' : ''}
            />
            <p className="text-xs text-gray-500">
              Mín: {maintenanceType.min_time_interval_months} meses | 
              Máx: {maintenanceType.max_time_interval_months} meses |
              Padrão: {maintenanceType.default_time_interval_months} meses
            </p>
            {!isTimeValid && (
              <p className="text-xs text-red-600">
                Valor deve estar entre {maintenanceType.min_time_interval_months} e {maintenanceType.max_time_interval_months} meses
              </p>
            )}
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={onReset}
            disabled={saving || !isEnabled}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar Padrão
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={!canSave}
            className="flex items-center gap-2"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MaintenanceConfigAdmin;