import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useOilCoolantAlerts, MaintenanceAlert } from '../hooks/useOilCoolantAlerts';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Calendar,
  Wrench,
  Droplets,
  Gauge,
  Clock,
  Info,
  XCircle,
  Zap,
  CheckSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MaintenanceAlertsPanel: React.FC = () => {
  const {
    alerts,
    loading,
    error,
    getAlertsByStatus,
    getAlertsByCategory,
    getAlertCounts,
    getUpcomingMaintenance,
    registerMaintenance
  } = useOilCoolantAlerts();

  const [selectedCategory, setSelectedCategory] = useState<'all' | 'oil' | 'coolant'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'VENCIDO' | 'URGENTE' | 'PROXIMO' | 'OK'>('all');
  
  // Estados para o modal de registro de manutenção
  const [isMarkDoneDialogOpen, setIsMarkDoneDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<MaintenanceAlert | null>(null);
  const [markDoneForm, setMarkDoneForm] = useState({
    maintenanceDate: new Date().toISOString().split('T')[0],
    description: '',
    cost: 0,
    performedBy: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const alertCounts = getAlertCounts();

  // Função para abrir o modal de marcar como feito
  const handleMarkAsDone = (alert: MaintenanceAlert) => {
    setSelectedAlert(alert);
    setMarkDoneForm({
      maintenanceDate: new Date().toISOString().split('T')[0],
      description: `Manutenção de ${alert.maintenanceType} realizada`,
      cost: 0,
      performedBy: '',
      notes: ''
    });
    setIsMarkDoneDialogOpen(true);
  };

  // Função para registrar a manutenção
  const handleRegisterMaintenance = async () => {
    if (!selectedAlert) return;

    setSaving(true);
    try {
      // Buscar a quilometragem atual do veículo
      const { data: kmData } = await supabase
        .from('km_records')
        .select('km')
        .eq('car_id', selectedAlert.carId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const currentKm = kmData?.km || 0;

      // Determinar o tipo de manutenção baseado no alert
      let maintenanceTypeId = '';
      const maintenanceType = selectedAlert.maintenanceType.toLowerCase();
      
      if (maintenanceType.includes('óleo')) {
        maintenanceTypeId = maintenanceType.includes('troca') ? 'oil_change' : 'oil_check';
      } else if (maintenanceType.includes('fluido') || maintenanceType.includes('coolant')) {
        maintenanceTypeId = maintenanceType.includes('troca') ? 'coolant_change' : 'coolant_check';
      } else {
        maintenanceTypeId = 'revision';
      }

      await registerMaintenance(
        selectedAlert.carId,
        maintenanceTypeId,
        markDoneForm.maintenanceDate,
        currentKm,
        markDoneForm.description,
        markDoneForm.cost,
        markDoneForm.performedBy,
        markDoneForm.notes
      );

      toast.success('Manutenção registrada com sucesso!');
      setIsMarkDoneDialogOpen(false);
      setSelectedAlert(null);
      
      // Recarregar os alertas
      window.location.reload();
    } catch (error) {
      console.error('Erro ao registrar manutenção:', error);
      toast.error('Erro ao registrar manutenção');
    } finally {
      setSaving(false);
    }
  };
  const upcomingMaintenance = getUpcomingMaintenance();

  // Filtrar alertas baseado nas seleções
  const getFilteredAlerts = (): MaintenanceAlert[] => {
    let filtered = alerts;

    if (selectedCategory !== 'all') {
      filtered = getAlertsByCategory(selectedCategory);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(alert => alert.overall_status === selectedStatus);
    }

    return filtered;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VENCIDO':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'URGENTE':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'PROXIMO':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'OK':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'VENCIDO': 'destructive',
      'URGENTE': 'destructive',
      'PROXIMO': 'secondary',
      'OK': 'default'
    } as const;

    const labels = {
      'VENCIDO': 'Vencido',
      'URGENTE': 'Urgente',
      'PROXIMO': 'Próximo',
      'OK': 'Em dia'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Não definido';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  const formatKm = (km: number | null) => {
    if (km === null) return 'N/A';
    return km.toLocaleString('pt-BR') + ' km';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando alertas de manutenção...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar alertas de manutenção: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo dos Alertas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-800">Vencidos</p>
                <p className="text-2xl font-bold text-red-900">{alertCounts.vencido}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-800">Urgentes</p>
                <p className="text-2xl font-bold text-orange-900">{alertCounts.urgente}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-800">Próximos</p>
                <p className="text-2xl font-bold text-yellow-900">{alertCounts.proximo}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Em Dia</p>
                <p className="text-2xl font-bold text-green-900">{alertCounts.ok}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Próximas Manutenções */}
      {upcomingMaintenance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Próximas Manutenções (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingMaintenance.slice(0, 5).map((alert) => (
                <div key={`${alert.car_id}-${alert.maintenance_type_id}`} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getCategoryIcon(alert.category)}
                    <div>
                      <p className="font-medium">{alert.plate} - {alert.maintenance_type}</p>
                      <p className="text-sm text-gray-600">{alert.brand} {alert.model}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatDate(alert.calculated_next_due_date)}</p>
                    <p className="text-xs text-gray-600">{formatKm(alert.next_due_km)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros e Lista de Alertas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Alertas de Manutenção
          </CardTitle>
          
          {/* Filtros */}
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex gap-2">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                Todos
              </Button>
              <Button
                variant={selectedCategory === 'oil' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('oil')}
                className="flex items-center gap-1"
              >
                <Droplets className="h-3 w-3" />
                Óleo
              </Button>
              <Button
                variant={selectedCategory === 'coolant' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('coolant')}
                className="flex items-center gap-1"
              >
                <Droplets className="h-3 w-3" />
                Fluido
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={selectedStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('all')}
              >
                Todos Status
              </Button>
              <Button
                variant={selectedStatus === 'VENCIDO' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('VENCIDO')}
              >
                Vencidos
              </Button>
              <Button
                variant={selectedStatus === 'URGENTE' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('URGENTE')}
              >
                Urgentes
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {getFilteredAlerts().length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum alerta encontrado com os filtros selecionados.</p>
              </div>
            ) : (
              getFilteredAlerts().map((alert) => (
                <div key={`${alert.car_id}-${alert.maintenance_type_id}`} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center gap-1">
                        {getCategoryIcon(alert.category)}
                        {getStatusIcon(alert.overall_status)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{alert.plate}</h3>
                          {getStatusBadge(alert.overall_status)}
                        </div>
                        
                        <p className="text-gray-600 mb-1">{alert.brand} {alert.model}</p>
                        <p className="font-medium text-blue-600 mb-2">{alert.maintenance_type}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Gauge className="h-3 w-3 text-gray-500" />
                            <span className="text-gray-600">KM Atual:</span>
                            <span className="font-medium">{formatKm(alert.current_km)}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Gauge className="h-3 w-3 text-gray-500" />
                            <span className="text-gray-600">Próximo:</span>
                            <span className="font-medium">{formatKm(alert.next_due_km)}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-gray-500" />
                            <span className="text-gray-600">Data:</span>
                            <span className="font-medium">{formatDate(alert.calculated_next_due_date)}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-gray-500" />
                            <span className="text-gray-600">Última:</span>
                            <span className="font-medium">{formatDate(alert.last_maintenance_date)}</span>
                          </div>
                        </div>
                        
                        {alert.km_until_due !== null && alert.km_until_due > 0 && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span>Faltam {formatKm(alert.km_until_due)} para a próxima manutenção</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Botão Marcar como Feito */}
                    {(alert.overall_status === 'VENCIDO' || alert.overall_status === 'URGENTE') && (
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => handleMarkAsDone(alert)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
                        >
                          <CheckSquare className="h-3 w-3" />
                          Marcar como Feito
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Modal para Marcar como Feito */}
      <Dialog open={isMarkDoneDialogOpen} onOpenChange={setIsMarkDoneDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar Manutenção como Feita</DialogTitle>
          </DialogHeader>
          
          {selectedAlert && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium">{selectedAlert.plate} - {selectedAlert.brand} {selectedAlert.model}</p>
                <p className="text-sm text-gray-600">{selectedAlert.maintenanceType}</p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Data da Manutenção</label>
                  <Input
                    type="date"
                    value={markDoneForm.maintenanceDate}
                    onChange={(e) => setMarkDoneForm(prev => ({ ...prev, maintenanceDate: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Descrição</label>
                  <Input
                    value={markDoneForm.description}
                    onChange={(e) => setMarkDoneForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição da manutenção realizada"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Custo (R$)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={markDoneForm.cost}
                    onChange={(e) => setMarkDoneForm(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Realizado por</label>
                  <Input
                    value={markDoneForm.performedBy}
                    onChange={(e) => setMarkDoneForm(prev => ({ ...prev, performedBy: e.target.value }))}
                    placeholder="Nome do responsável"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Observações</label>
                  <Textarea
                    value={markDoneForm.notes}
                    onChange={(e) => setMarkDoneForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Observações adicionais"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsMarkDoneDialogOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleRegisterMaintenance}
                  disabled={saving}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {saving ? 'Salvando...' : 'Confirmar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MaintenanceAlertsPanel;