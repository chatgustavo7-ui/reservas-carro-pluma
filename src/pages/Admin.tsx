import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { withRetry } from '@/integrations/supabase/retryUtils';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Car, User, Settings, Plus, Edit, Trash2, AlertTriangle, CheckCircle, Clock, Mail } from 'lucide-react';
import { formatDateTimeForDisplay, formatDateObjectForDisplay } from '@/utils/dateUtils';
import { MaintenanceAlerts } from '@/components/MaintenanceAlerts';
import { MaintenanceAlertsPanel } from '@/components/MaintenanceAlertsPanel';

interface Car {
  id: string;
  plate: string;
  model: string;
  current_km: number;
  next_maintenance_km: number;
  status: 'available' | 'unavailable' | 'in_use' | 'maintenance';
  unavailable_until?: string;
}

interface Conductor {
  id: string;
  name: string;
  email: string;
  phone: string;
  is_active: boolean;
}

interface MaintenanceRecord {
  id: string;
  car_id: string;
  maintenance_type: string;
  description: string;
  km_at_maintenance: number;
  cost: number;
  performed_at: string;
  cars: {
    plate: string;
    model: string;
  };
}

interface OverdueReservation {
  id: string;
  conductor_name: string;
  conductor_email: string;
  car_model: string;
  car_plate: string;
  return_date: string;
  days_overdue: number;
  last_reminder_sent: string | null;
}

const Admin = () => {
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [selectedConductor, setSelectedConductor] = useState<Conductor | null>(null);
  const [isCarDialogOpen, setIsCarDialogOpen] = useState(false);
  const [isConductorDialogOpen, setIsConductorDialogOpen] = useState(false);
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  // Queries
  const { data: cars } = useQuery({
    queryKey: ['admin-cars'],
    queryFn: async () => {
      const result = await withRetry.select(() => 
        supabase.from('cars').select('*').order('plate', { ascending: true })
      );
      if (result.error) throw result.error;
      return result.data as Car[];
    },
    retry: false
  });

  const { data: conductors } = useQuery({
    queryKey: ['admin-conductors'],
    queryFn: async () => {
      const result = await withRetry.select(() => 
        supabase.from('conductors').select('*').order('name', { ascending: true })
      );
      if (result.error) throw result.error;
      return result.data as Conductor[];
    },
    retry: false
  });

  const { data: maintenanceRecords } = useQuery({
    queryKey: ['maintenance-records'],
    queryFn: async () => {
      const result = await withRetry.select(() => 
        supabase
          .from('maintenance_records')
          .select(`
            *,
            cars (plate, model)
          `)
          .order('performed_at', { ascending: false })
          .limit(20)
      );
      if (result.error) throw result.error;
      return result.data as MaintenanceRecord[];
    },
    retry: false
  });

  const { data: overdueReservations } = useQuery({
    queryKey: ['overdue-reservations'],
    queryFn: async () => {
      const result = await withRetry.operation(() => 
        supabase.rpc('get_overdue_reservations')
      );
      if (result.error) throw result.error;
      return result.data as OverdueReservation[];
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
    retry: false
  });

  // Mutations
  const updateCarMutation = useMutation({
    mutationFn: async (data: Partial<Car> & { id: string }) => {
      const { error } = await supabase
        .from('cars')
        .update(data)
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Carro atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['admin-cars'] });
      setIsCarDialogOpen(false);
      setSelectedCar(null);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar carro: ${error.message}`);
    }
  });

  const updateConductorMutation = useMutation({
    mutationFn: async (data: Partial<Conductor> & { id: string }) => {
      const { error } = await supabase
        .from('conductors')
        .update(data)
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Condutor atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['admin-conductors'] });
      setIsConductorDialogOpen(false);
      setSelectedConductor(null);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar condutor: ${error.message}`);
    }
  });

  const addMaintenanceMutation = useMutation({
    mutationFn: async (data: {
      car_id: string;
      maintenance_type: string;
      description: string;
      km_at_maintenance: number;
      cost: number;
      next_maintenance_km: number;
    }) => {
      // Adicionar registro de manutenção
      const { error: maintenanceError } = await supabase
        .from('maintenance_records')
        .insert({
          car_id: data.car_id,
          maintenance_type: data.maintenance_type,
          description: data.description,
          km_at_maintenance: data.km_at_maintenance,
          cost: data.cost,
          performed_at: new Date().toISOString()
        });
      
      if (maintenanceError) throw maintenanceError;

      // Atualizar próxima manutenção do carro
      const { error: carError } = await supabase
        .from('cars')
        .update({ 
          next_maintenance_km: data.next_maintenance_km,
          status: 'available'
        })
        .eq('id', data.car_id);
      
      if (carError) throw carError;
    },
    onSuccess: () => {
      toast.success('Manutenção registrada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['maintenance-records'] });
      queryClient.invalidateQueries({ queryKey: ['admin-cars'] });
      setIsMaintenanceDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao registrar manutenção: ${error.message}`);
    }
  });

  const makeCarAvailableMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('make_cars_available');
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Carros atualizados com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['admin-cars'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar carros: ${error.message}`);
    }
  });

  const washCleanupMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('manual_car_wash_cleanup');
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Limpeza do lavacar processada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['admin-cars'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao processar limpeza: ${error.message}`);
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': {
        return 'bg-green-100 text-green-800';
      }
      case 'unavailable': {
        return 'bg-orange-100 text-orange-800';
      }
      case 'in_use': {
        return 'bg-blue-100 text-blue-800';
      }
      case 'maintenance': {
        return 'bg-red-100 text-red-800';
      }
      default: {
        return 'bg-gray-100 text-gray-800';
      }
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'Disponível';
      case 'unavailable': return 'Indisponível';
      case 'in_use': return 'Em Uso';
      case 'maintenance': return 'Manutenção';
      default: return status;
    }
  };

  const needsMaintenance = (car: Car) => {
    return car.current_km >= car.next_maintenance_km;
  };

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Administração</h1>
          <div className="flex gap-2">
            <Button
              onClick={() => makeCarAvailableMutation.mutate()}
              disabled={makeCarAvailableMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {makeCarAvailableMutation.isPending ? 'Atualizando...' : 'Atualizar Status dos Carros'}
            </Button>
            <Button
              onClick={() => washCleanupMutation.mutate()}
              disabled={washCleanupMutation.isPending}
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              {washCleanupMutation.isPending ? 'Processando...' : 'Processar Lavacar'}
            </Button>
          </div>
        </div>

        <MaintenanceAlerts />
        
        <MaintenanceAlertsPanel className="mb-6" />

        <Tabs defaultValue="cars" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="cars" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              Carros
            </TabsTrigger>
            <TabsTrigger value="conductors" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Condutores
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Viagens em Atraso
              {overdueReservations && overdueReservations.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {overdueReservations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Manutenção
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cars">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Carros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {cars?.map((car) => (
                    <div key={car.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{car.model}</h3>
                          <Badge variant="outline">{car.plate}</Badge>
                          <Badge className={getStatusColor(car.status)}>
                            {getStatusText(car.status)}
                          </Badge>
                          {needsMaintenance(car) && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Manutenção Necessária
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          KM Atual: {car.current_km ? car.current_km.toLocaleString() : '-'} | Próxima Manutenção: {car.next_maintenance_km.toLocaleString()}
                        </div>
                        {car.unavailable_until && (
                          <div className="text-sm text-orange-600 mt-1">
                            Indisponível até: {formatDateTimeForDisplay(new Date(car.unavailable_until))}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCar(car);
                          setIsCarDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conductors">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Condutores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {conductors?.map((conductor) => (
                    <div key={conductor.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{conductor.name}</h3>
                          <Badge className={conductor.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {conductor.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {conductor.email} | {conductor.phone}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedConductor(conductor);
                          setIsConductorDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitoring">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Viagens em Atraso
                  {overdueReservations && overdueReservations.length > 0 && (
                    <Badge variant="destructive">
                      {overdueReservations.length} viagem{overdueReservations.length !== 1 ? 'ns' : ''}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!overdueReservations || overdueReservations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p className="text-lg font-medium">Nenhuma viagem em atraso!</p>
                    <p className="text-sm">Todas as viagens estão em dia.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {overdueReservations.map((reservation) => {
                      const getUrgencyLevel = (days: number) => {
                        if (days >= 7) return { level: 'crítico', color: 'bg-red-100 text-red-800 border-red-200' };
                        if (days >= 3) return { level: 'urgente', color: 'bg-orange-100 text-orange-800 border-orange-200' };
                        return { level: 'atenção', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
                      };
                      
                      const urgency = getUrgencyLevel(reservation.days_overdue);
                      
                      return (
                        <div key={reservation.id} className={`p-4 border-2 rounded-lg ${urgency.color}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold">{reservation.conductor_name}</h3>
                              <Badge variant="outline">{reservation.car_model} - {reservation.car_plate}</Badge>
                              <Badge className={urgency.color}>
                                {reservation.days_overdue} dia{reservation.days_overdue !== 1 ? 's' : ''} em atraso
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="h-4 w-4" />
                              Deveria ter retornado em {formatDateObjectForDisplay(new Date(reservation.return_date))}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p><strong>Email:</strong> {reservation.conductor_email}</p>
                              <p><strong>Nível de urgência:</strong> <span className="capitalize font-medium">{urgency.level}</span></p>
                            </div>
                            <div>
                              {reservation.last_reminder_sent ? (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Mail className="h-4 w-4" />
                                  <span>Último lembrete: {formatDateTimeForDisplay(new Date(reservation.last_reminder_sent))}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-gray-500">
                                  <Mail className="h-4 w-4" />
                                  <span>Nenhum lembrete enviado ainda</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="mt-3 p-3 bg-white/50 rounded border">
                            <p className="text-sm">
                              <strong>Sistema automático ativo:</strong> Lembretes são enviados 3x ao dia (8h, 14h, 20h) e a viagem será finalizada automaticamente às 18h se não for concluída.
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Registrar Manutenção
                    <Dialog open={isMaintenanceDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Nova Manutenção
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Registrar Manutenção</DialogTitle>
                        </DialogHeader>
                        {cars && (
                          <MaintenanceForm
                            cars={cars}
                            onSubmit={(data) => addMaintenanceMutation.mutate(data)}
                            isLoading={addMaintenanceMutation.isPending}
                          />
                        )}
                      </DialogContent>
                    </Dialog>
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Manutenções</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {maintenanceRecords?.map((record) => (
                      <div key={record.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold">{record.cars.model} - {record.cars.plate}</h3>
                            <Badge variant="outline">{record.maintenance_type}</Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatDateObjectForDisplay(new Date(record.performed_at))}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          KM: {record.km_at_maintenance.toLocaleString()} | Custo: R$ {record.cost.toFixed(2)}
                        </div>
                        {record.description && (
                          <div className="text-sm text-gray-700 mt-2">
                            {record.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <CarEditDialog
          car={selectedCar}
          open={isCarDialogOpen}
          onOpenChange={setIsCarDialogOpen}
          onSubmit={(data) => updateCarMutation.mutate(data)}
          isLoading={updateCarMutation.isPending}
        />

        <ConductorEditDialog
          conductor={selectedConductor}
          open={isConductorDialogOpen}
          onOpenChange={setIsConductorDialogOpen}
          onSubmit={(data) => updateConductorMutation.mutate(data)}
          isLoading={updateConductorMutation.isPending}
        />
      </div>
    </Layout>
  );
};

const CarEditDialog = ({ car, open, onOpenChange, onSubmit, isLoading }: {
  car: Car | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { id: string; plate: string; model: string; current_km: number; next_maintenance_km: number; status: string; unavailable_until?: string }) => void;
  isLoading: boolean;
}) => {
  const [formData, setFormData] = useState({
    plate: '',
    model: '',
    current_km: '',
    next_maintenance_km: '',
    status: 'available',
    unavailable_until: ''
  });

  useState(() => {
    if (car) {
      setFormData({
        plate: car.plate,
        model: car.model,
        current_km: car.current_km.toString(),
        next_maintenance_km: car.next_maintenance_km.toString(),
        status: car.status,
        unavailable_until: car.unavailable_until ? car.unavailable_until.slice(0, 16) : ''
      });
    }
  }, [car]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!car) return;
    
    const submitData: {
      id: string;
      plate: string;
      model: string;
      current_km: number;
      next_maintenance_km: number;
      status: string;
      unavailable_until?: string | null;
    } = {
      id: car.id,
      plate: formData.plate,
      model: formData.model,
      current_km: Number(formData.current_km),
      next_maintenance_km: Number(formData.next_maintenance_km),
      status: formData.status
    };

    if (formData.unavailable_until) {
      submitData.unavailable_until = new Date(formData.unavailable_until).toISOString();
    } else {
      submitData.unavailable_until = null;
    }

    onSubmit(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Carro</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Placa</Label>
            <Input
              value={formData.plate}
              onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
            />
          </div>
          <div>
            <Label>Modelo</Label>
            <Input
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            />
          </div>
          <div>
            <Label>KM Atual</Label>
            <Input
              type="number"
              value={formData.current_km}
              onChange={(e) => setFormData({ ...formData, current_km: e.target.value })}
            />
          </div>
          <div>
            <Label>Próxima Manutenção (KM)</Label>
            <Input
              type="number"
              value={formData.next_maintenance_km}
              onChange={(e) => setFormData({ ...formData, next_maintenance_km: e.target.value })}
            />
          </div>
          <div>
            <Label>Indisponível até (opcional)</Label>
            <Input
              type="datetime-local"
              value={formData.unavailable_until}
              onChange={(e) => setFormData({ ...formData, unavailable_until: e.target.value })}
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={formData.status || ""} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Disponível</SelectItem>
                <SelectItem value="unavailable">Indisponível</SelectItem>
                <SelectItem value="maintenance">Manutenção</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const ConductorEditDialog = ({ conductor, open, onOpenChange, onSubmit, isLoading }: {
  conductor: Conductor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { id: string; name: string; email: string; phone: string; is_active: boolean }) => void;
  isLoading: boolean;
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    is_active: true
  });

  useState(() => {
    if (conductor) {
      setFormData({
        name: conductor.name,
        email: conductor.email,
        phone: conductor.phone,
        is_active: conductor.is_active
      });
    }
  }, [conductor]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conductor) return;
    
    onSubmit({
      id: conductor.id,
      ...formData
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Condutor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            />
            <Label>Ativo</Label>
          </div>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const MaintenanceForm = ({ cars, onSubmit, isLoading }: {
  cars: Car[];
  onSubmit: (data: { car_id: string; maintenance_type: string; description: string; km_at_maintenance: number; cost: number; next_maintenance_km: number }) => void;
  isLoading: boolean;
}) => {
  const [formData, setFormData] = useState({
    car_id: '',
    maintenance_type: '',
    description: '',
    km_at_maintenance: '',
    cost: '',
    next_maintenance_km: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      car_id: formData.car_id,
      maintenance_type: formData.maintenance_type,
      description: formData.description,
      km_at_maintenance: Number(formData.km_at_maintenance),
      cost: Number(formData.cost),
      next_maintenance_km: Number(formData.next_maintenance_km)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Carro</Label>
        <Select value={formData.car_id || ""} onValueChange={(value) => setFormData({ ...formData, car_id: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o carro" />
          </SelectTrigger>
          <SelectContent>
            {cars.map((car) => (
              <SelectItem key={car.id} value={car.id}>
                {car.model} - {car.plate}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Tipo de Manutenção</Label>
        <Select value={formData.maintenance_type || ""} onValueChange={(value) => setFormData({ ...formData, maintenance_type: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="preventiva">Preventiva</SelectItem>
            <SelectItem value="corretiva">Corretiva</SelectItem>
            <SelectItem value="revisao">Revisão</SelectItem>
            <SelectItem value="troca_oleo">Troca de Óleo</SelectItem>
            <SelectItem value="pneus">Pneus</SelectItem>
            <SelectItem value="freios">Freios</SelectItem>
            <SelectItem value="outros">Outros</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>KM na Manutenção</Label>
        <Input
          type="number"
          value={formData.km_at_maintenance}
          onChange={(e) => setFormData({ ...formData, km_at_maintenance: e.target.value })}
        />
      </div>
      <div>
        <Label>Custo (R$)</Label>
        <Input
          type="number"
          step="0.01"
          value={formData.cost}
          onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
        />
      </div>
      <div>
        <Label>Próxima Manutenção (KM)</Label>
        <Input
          type="number"
          value={formData.next_maintenance_km}
          onChange={(e) => setFormData({ ...formData, next_maintenance_km: e.target.value })}
        />
      </div>
      <div>
        <Label>Descrição</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Registrando...' : 'Registrar Manutenção'}
      </Button>
    </form>
  );
};

export default Admin;