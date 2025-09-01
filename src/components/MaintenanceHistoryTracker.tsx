import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { useOilCoolantAlerts, MaintenanceHistory, MaintenanceType } from '../hooks/useOilCoolantAlerts';
import { supabase } from '../integrations/supabase/client';
import { 
  Plus, 
  History, 
  Car, 
  Wrench, 
  Droplets,
  Calendar,
  Gauge,
  DollarSign,
  User,
  FileText,
  Save,
  AlertTriangle,
  CheckCircle,
  Filter,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Car {
  id: string;
  plate: string;
  model: string;
  brand: string;
  current_km: number;
}

const MaintenanceHistoryTracker: React.FC = () => {
  const {
    maintenanceTypes,
    registerMaintenance,
    getMaintenanceHistory,
    fetchMaintenanceAlerts
  } = useOilCoolantAlerts();

  const [cars, setCars] = useState<Car[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceHistory[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<MaintenanceHistory[]>([]);
  
  // Estados para filtros
  const [filterCarId, setFilterCarId] = useState<string>('all');
  const [filterMaintenanceType, setFilterMaintenanceType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  // Estados para o formulário de nova manutenção
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    carId: '',
    maintenanceTypeId: '',
    maintenanceDate: new Date().toISOString().split('T')[0],
    kmAtMaintenance: '',
    description: '',
    cost: '',
    performedBy: '',
    notes: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Buscar carros
  const fetchCars = async () => {
    try {
      const { data, error } = await supabase
        .from('cars')
        .select('id, plate, model, brand, current_km')
        .order('plate');

      if (error) throw error;
      setCars(data || []);
    } catch (err) {
      console.error('Erro ao buscar carros:', err);
      toast.error('Erro ao carregar veículos');
    }
  };

  // Buscar histórico de manutenção
  const fetchHistory = async () => {
    try {
      setLoading(true);
      const history = await getMaintenanceHistory();
      setMaintenanceHistory(history);
      setFilteredHistory(history);
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  // Aplicar filtros
  const applyFilters = () => {
    let filtered = maintenanceHistory;

    if (filterCarId !== 'all') {
      filtered = filtered.filter(item => item.car_id === filterCarId);
    }

    if (filterMaintenanceType !== 'all') {
      filtered = filtered.filter(item => item.maintenance_type_id === filterMaintenanceType);
    }

    if (filterCategory !== 'all') {
      const typeIds = maintenanceTypes
        .filter(mt => mt.category === filterCategory)
        .map(mt => mt.id);
      filtered = filtered.filter(item => typeIds.includes(item.maintenance_type_id));
    }

    setFilteredHistory(filtered);
  };

  // Submeter nova manutenção
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.carId || !formData.maintenanceTypeId || !formData.kmAtMaintenance) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setSaving(true);
      await registerMaintenance(
        formData.carId,
        formData.maintenanceTypeId,
        formData.maintenanceDate,
        parseInt(formData.kmAtMaintenance),
        formData.description || undefined,
        formData.cost ? parseFloat(formData.cost) : undefined,
        formData.performedBy || undefined,
        formData.notes || undefined
      );

      toast.success('Manutenção registrada com sucesso!');
      setIsDialogOpen(false);
      resetForm();
      await fetchHistory();
      await fetchMaintenanceAlerts();
    } catch (err) {
      console.error('Erro ao registrar manutenção:', err);
      toast.error('Erro ao registrar manutenção');
    } finally {
      setSaving(false);
    }
  };

  // Resetar formulário
  const resetForm = () => {
    setFormData({
      carId: '',
      maintenanceTypeId: '',
      maintenanceDate: new Date().toISOString().split('T')[0],
      kmAtMaintenance: '',
      description: '',
      cost: '',
      performedBy: '',
      notes: ''
    });
  };

  // Obter informações do carro selecionado
  const getSelectedCar = () => {
    return cars.find(car => car.id === formData.carId);
  };

  // Obter tipo de manutenção
  const getMaintenanceTypeName = (typeId: string) => {
    const type = maintenanceTypes.find(mt => mt.id === typeId);
    return type ? type.name : 'Tipo não encontrado';
  };

  // Obter informações do carro
  const getCarInfo = (carId: string) => {
    const car = cars.find(c => c.id === carId);
    return car ? `${car.plate} - ${car.brand} ${car.model}` : 'Veículo não encontrado';
  };

  // Formatar data
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  // Formatar moeda
  const formatCurrency = (value: number | null) => {
    if (value === null) return 'N/A';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Ícone da categoria
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

  useEffect(() => {
    fetchCars();
    fetchHistory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filterCarId, filterMaintenanceType, filterCategory, maintenanceHistory]);

  // Auto-preencher KM atual quando selecionar carro
  useEffect(() => {
    const selectedCar = getSelectedCar();
    if (selectedCar && !formData.kmAtMaintenance) {
      setFormData(prev => ({
        ...prev,
        kmAtMaintenance: selectedCar.current_km.toString()
      }));
    }
  }, [formData.carId]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho com botão de nova manutenção */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Manutenções
            </CardTitle>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Manutenção
                </Button>
              </DialogTrigger>
              
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Registrar Nova Manutenção</DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Seleção de Veículo */}
                    <div className="space-y-2">
                      <Label htmlFor="car-select">Veículo *</Label>
                      <Select value={formData.carId} onValueChange={(value) => setFormData(prev => ({ ...prev, carId: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o veículo" />
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

                    {/* Tipo de Manutenção */}
                    <div className="space-y-2">
                      <Label htmlFor="maintenance-type">Tipo de Manutenção *</Label>
                      <Select value={formData.maintenanceTypeId} onValueChange={(value) => setFormData(prev => ({ ...prev, maintenanceTypeId: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {maintenanceTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              <div className="flex items-center gap-2">
                                {getCategoryIcon(type.category)}
                                {type.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Data da Manutenção */}
                    <div className="space-y-2">
                      <Label htmlFor="maintenance-date">Data da Manutenção *</Label>
                      <Input
                        id="maintenance-date"
                        type="date"
                        value={formData.maintenanceDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, maintenanceDate: e.target.value }))}
                        required
                      />
                    </div>

                    {/* KM na Manutenção */}
                    <div className="space-y-2">
                      <Label htmlFor="km-maintenance">KM na Manutenção *</Label>
                      <Input
                        id="km-maintenance"
                        type="number"
                        value={formData.kmAtMaintenance}
                        onChange={(e) => setFormData(prev => ({ ...prev, kmAtMaintenance: e.target.value }))}
                        placeholder="Ex: 15000"
                        required
                      />
                      {getSelectedCar() && (
                        <p className="text-xs text-gray-500">
                          KM atual do veículo: {getSelectedCar()?.current_km.toLocaleString()}
                        </p>
                      )}
                    </div>

                    {/* Custo */}
                    <div className="space-y-2">
                      <Label htmlFor="cost">Custo (R$)</Label>
                      <Input
                        id="cost"
                        type="number"
                        step="0.01"
                        value={formData.cost}
                        onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                        placeholder="Ex: 150.00"
                      />
                    </div>

                    {/* Executado por */}
                    <div className="space-y-2">
                      <Label htmlFor="performed-by">Executado por</Label>
                      <Input
                        id="performed-by"
                        value={formData.performedBy}
                        onChange={(e) => setFormData(prev => ({ ...prev, performedBy: e.target.value }))}
                        placeholder="Ex: Oficina ABC, João Silva"
                      />
                    </div>
                  </div>

                  {/* Descrição */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Breve descrição da manutenção realizada"
                    />
                  </div>

                  {/* Observações */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Observações adicionais, peças trocadas, etc."
                      rows={3}
                    />
                  </div>

                  {/* Botões */}
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={saving} className="flex items-center gap-2">
                      {saving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {saving ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filtro por Veículo */}
            <div className="space-y-2">
              <Label>Veículo</Label>
              <Select value={filterCarId} onValueChange={setFilterCarId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os veículos</SelectItem>
                  {cars.map((car) => (
                    <SelectItem key={car.id} value={car.id}>
                      {car.plate} - {car.brand} {car.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Categoria */}
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  <SelectItem value="oil">Óleo</SelectItem>
                  <SelectItem value="coolant">Fluido de Arrefecimento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Tipo */}
            <div className="space-y-2">
              <Label>Tipo de Manutenção</Label>
              <Select value={filterMaintenanceType} onValueChange={setFilterMaintenanceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {maintenanceTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista do Histórico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Histórico ({filteredHistory.length} registros)</span>
            {filteredHistory.length > 0 && (
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Carregando histórico...</p>
              </div>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma manutenção encontrada com os filtros selecionados.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map((item) => {
                const maintenanceType = maintenanceTypes.find(mt => mt.id === item.maintenance_type_id);
                return (
                  <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        {maintenanceType && getCategoryIcon(maintenanceType.category)}
                        <div>
                          <h3 className="font-semibold text-lg">{getCarInfo(item.car_id)}</h3>
                          <p className="text-blue-600 font-medium">{getMaintenanceTypeName(item.maintenance_type_id)}</p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {formatDate(item.maintenance_date)}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div className="flex items-center gap-1">
                        <Gauge className="h-3 w-3 text-gray-500" />
                        <span className="text-gray-600">KM:</span>
                        <span className="font-medium">{item.km_at_maintenance.toLocaleString()}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Gauge className="h-3 w-3 text-gray-500" />
                        <span className="text-gray-600">Próximo:</span>
                        <span className="font-medium">{item.next_due_km.toLocaleString()} km</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-gray-500" />
                        <span className="text-gray-600">Próxima data:</span>
                        <span className="font-medium">{formatDate(item.next_due_date)}</span>
                      </div>
                      
                      {item.cost && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-gray-500" />
                          <span className="text-gray-600">Custo:</span>
                          <span className="font-medium">{formatCurrency(item.cost)}</span>
                        </div>
                      )}
                    </div>
                    
                    {(item.description || item.performed_by) && (
                      <div className="text-sm text-gray-600 space-y-1">
                        {item.description && (
                          <p><span className="font-medium">Descrição:</span> {item.description}</p>
                        )}
                        {item.performed_by && (
                          <p><span className="font-medium">Executado por:</span> {item.performed_by}</p>
                        )}
                      </div>
                    )}
                    
                    {item.notes && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                        <p><span className="font-medium">Observações:</span> {item.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MaintenanceHistoryTracker;