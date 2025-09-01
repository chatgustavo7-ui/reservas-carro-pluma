import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDateObjectForDisplay } from '@/utils/dateUtils';
import { CalendarIcon, Car, MapPin, Users, Clock, UserIcon, AlertTriangle, CheckCircle, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MultiDestinationField } from '@/components/MultiDestinationField';
import { supabase } from '../integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { sendReservationConfirmationEmail } from '@/services/emailService';
import { logSupabaseError, supabaseHealth } from '@/integrations/supabase/supabaseHealth';
import { withRetry } from '@/integrations/supabase/retryUtils';

interface Car {
  id: string;
  plate: string;
  model: string;
  brand: string;
  current_km: number;
  last_revision_km: number;
  next_revision_km: number;
  status: string;
}

interface CarWithLastUse extends Car {
  last_use_date?: string;
  days_since_last_use?: number;
}

interface Conductor {
  id: string;
  name: string;
  email: string;
  active: boolean;
}

const isDateFromToday = (date: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate >= today;
};

const dateToLocalString = (date: Date) => {
  return date.toISOString().split('T')[0];
};

const reservationSchema = z.object({
  selectedCarId: z.string().min(1, 'Selecione um carro'),
  pickupDate: z.date({
    required_error: 'Data de retirada é obrigatória',
  }).refine((date) => isDateFromToday(date), {
    message: 'Data de retirada deve ser hoje ou posterior',
  }),
  returnDate: z.date({
    required_error: 'Data de entrega é obrigatória',
  }),
  destinations: z
    .array(z.string().min(3, 'Destino deve ter pelo menos 3 caracteres'))
    .min(1, 'Informe ao menos um destino'),
  driver: z.string().min(1, 'Condutor é obrigatório'),
  companions: z.array(z.string()).optional(),
  driverEmail: z.string().email('Email inválido').optional().or(z.literal('')),
}).refine((data) => data.returnDate >= data.pickupDate, {
  message: 'Data de entrega deve ser igual ou posterior à data de retirada',
  path: ['returnDate'],
});

type ReservationForm = z.infer<typeof reservationSchema>;

const getAvailableCars = async (startDate: string, endDate: string) => {
  try {
    console.log('🔍 Buscando carros disponíveis com algoritmo inteligente...');
    
    // Usar a função do banco de dados que implementa o algoritmo inteligente
    const { data: smartCars, error } = await supabase
      .rpc('get_smart_car_lottery', {
        start_date_param: startDate,
        end_date_param: endDate
      });
    
    if (error) {
      console.error('Erro na função get_smart_car_lottery:', error);
      // Fallback para método tradicional
      return await getAvailableCarsTraditional(startDate, endDate);
    }
    
    console.log(`✅ Carros disponíveis (algoritmo inteligente): ${smartCars?.length || 0}`);
    return smartCars || [];
  } catch (error) {
    console.error('Erro ao buscar carros disponíveis:', error);
    // Fallback para método tradicional
    return await getAvailableCarsTraditional(startDate, endDate);
  }
};

// Função de fallback tradicional
const getAvailableCarsTraditional = async (startDate: string, endDate: string) => {
  try {
    // Buscar carros usando a view que considera a margem de quilometragem
    const { data: cars, error } = await supabase
      .from('cars_maintenance_status')
      .select('*')
      .eq('status', 'disponível')
      .eq('can_use', true); // Só carros que podem ser usados considerando a margem
    
    if (error) throw error;
    
    // Verificar disponibilidade verificando conflitos de reserva
    const availableCars = [];
    for (const car of cars || []) {
      const { data: conflictingReservations } = await supabase
        .from('reservations')
        .select('*')
        .eq('car', car.plate)
        .eq('status', 'ativa')
        .lte('pickup_date', endDate)
        .gte('return_date', startDate);
      
      if (!conflictingReservations || conflictingReservations.length === 0) {
        availableCars.push(car);
      }
    }
    
    console.log(`✅ Carros disponíveis (método tradicional com margem): ${availableCars.length}`);
    return availableCars;
  } catch (error) {
    console.error('Erro no método tradicional:', error);
    return [];
  }
};

const getCarsWithLastUse = async (): Promise<CarWithLastUse[]> => {
  try {
    console.log('🔍 Buscando carros com último uso...');
    
    // Buscar todos os carros com retry
    const carsResult = await withRetry.select(
      () => supabase
        .from('cars')
        .select('*')
        .order('plate', { ascending: true })
    );
    
    if (carsResult.error) {
      console.error('Erro ao buscar carros:', carsResult.error);
      throw carsResult.error;
    }
    
    const cars = carsResult.data || [];
    console.log(`✅ Carros encontrados: ${cars.length}`);
    
    // Para cada carro, buscar a última reserva
    const carsWithLastUse: CarWithLastUse[] = await Promise.all(
      cars.map(async (car) => {
        try {
          const reservationResult = await withRetry.select(
            () => supabase
              .from('reservations')
              .select('return_date')
              .eq('car', car.plate)
              .eq('status', 'concluida')
              .order('return_date', { ascending: false })
              .limit(1)
          );
          
          if (reservationResult.error) {
            console.warn(`Erro ao buscar última reserva do carro ${car.plate}:`, reservationResult.error);
          }
          
          let days_since_last_use = null;
          let last_use_date = null;
          
          const lastReservation = reservationResult.data;
          if (lastReservation && lastReservation.length > 0 && lastReservation[0]?.return_date) {
            last_use_date = lastReservation[0].return_date;
            const lastUseDate = new Date(lastReservation[0].return_date);
            const today = new Date();
            days_since_last_use = Math.floor((today.getTime() - lastUseDate.getTime()) / (1000 * 60 * 60 * 24));
          }
          
          return {
            ...car,
            last_use_date,
            days_since_last_use
          };
        } catch (error) {
          console.warn(`Erro ao processar carro ${car.plate}:`, error);
          return {
            ...car,
            last_use_date: null,
            days_since_last_use: null
          };
        }
      })
    );
    
    console.log(`✅ Processamento concluído: ${carsWithLastUse.length} carros`);
    return carsWithLastUse;
  } catch (error) {
    console.error('❌ Erro ao buscar carros com último uso:', error);
    logSupabaseError('getCarsWithLastUse', error);
    return [];
  }
};

const selectRandomCar = (availableCars: Car[]) => {
  if (availableCars.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * availableCars.length);
  return availableCars[randomIndex];
};

export const CarReservationForm = () => {
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableCarsForDates, setAvailableCarsForDates] = useState<Car[]>([]);
  const [autoSelectedCar, setAutoSelectedCar] = useState<Car | null>(null);

  // Buscar condutores ativos
  const { data: conductors, error: conductorsError, isLoading: conductorsLoading } = useQuery({
    queryKey: ['conductors'],
    queryFn: async () => {
      console.log('🔍 Buscando condutores ativos...');
      
      const result = await withRetry.select(
        () => supabase
          .from('conductors')
          .select('*')
          .eq('active', true)
          .order('name', { ascending: true })
      );
      
      if (result.error) {
        console.error('❌ Erro ao buscar condutores:', result.error);
        logSupabaseError('useQuery condutores', result.error);
        throw result.error;
      }
      
      console.log(`✅ Condutores encontrados: ${result.data?.length || 0}`);
      return result.data as Conductor[];
    },
    retry: false, // Retry é feito pelo withRetry
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000, // 10 minutos
  });

  // Buscar carros com informação de último uso
  const { data: carsWithLastUse, isLoading: carsLoading, error: carsError } = useQuery({
    queryKey: ['cars-with-last-use'],
    queryFn: getCarsWithLastUse,
    retry: false, // Retry é feito pelo withRetry
    staleTime: 2 * 60 * 1000, // 2 minutos
    cacheTime: 5 * 60 * 1000, // 5 minutos
  });

  const form = useForm<ReservationForm>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      selectedCarId: '',
      companions: [],
      destinations: [''],
      driverEmail: '',
    },
  });

  const watchedDriver = form.watch('driver');
  const watchedPickupDate = form.watch('pickupDate');
  const watchedReturnDate = form.watch('returnDate');
  const availableCompanions = conductors?.filter(conductor => conductor.name !== watchedDriver) || [];

  // Inicializar verificação de saúde do Supabase
  useEffect(() => {
    const initHealthCheck = async () => {
      console.log('🏥 Iniciando verificação de saúde do Supabase...');
      const healthResult = await supabaseHealth.performFullHealthCheck();
      
      if (!healthResult.overall) {
        console.warn('⚠️ Problemas detectados na conectividade do Supabase:', healthResult);
      }
    };
    
    initHealthCheck();
    // Iniciar verificação periódica
    supabaseHealth.startPeriodicCheck();
  }, []);

  // Atualizar email quando condutor for selecionado
  useEffect(() => {
    if (watchedDriver && conductors) {
      const selectedConductor = conductors.find(c => c.name === watchedDriver);
      if (selectedConductor?.email) {
        form.setValue('driverEmail', selectedConductor.email);
      }
    }
  }, [watchedDriver, conductors, form]);

  // Função para sortear carro automaticamente (algoritmo inteligente já aplicado no banco)
  const selectCarAutomatically = (availableCars: Car[]) => {
    if (availableCars.length === 0) return null;
    
    // Os carros já vêm ordenados pela função get_smart_car_lottery
    // que prioriza carros há mais tempo sem uso
    console.log('🎯 Selecionando carro com algoritmo inteligente:', {
      totalAvailable: availableCars.length,
      selectedCar: availableCars[0]?.plate,
      daysWithoutUse: availableCars[0]?.days_since_last_use || 'Nunca usado'
    });
    
    return availableCars[0];
  };

  // Verificar disponibilidade quando datas mudarem
  useEffect(() => {
    const checkAvailability = async () => {
      if (watchedPickupDate && watchedReturnDate) {
        const startDate = dateToLocalString(watchedPickupDate);
        const endDate = dateToLocalString(watchedReturnDate);
        const available = await getAvailableCars(startDate, endDate);
        setAvailableCarsForDates(available);
        
        // Se o carro selecionado não estiver mais disponível, limpar seleção
        const selectedCarId = form.getValues('selectedCarId');
        if (selectedCarId && !available.find(car => car.id === selectedCarId)) {
          form.setValue('selectedCarId', '');
        }
      }
    };
    
    checkAvailability();
  }, [watchedPickupDate, watchedReturnDate, form]);

  // Sortear carro automaticamente quando carros disponíveis mudarem
  useEffect(() => {
    if (availableCarsForDates.length > 0) {
      const selectedCar = selectCarAutomatically(availableCarsForDates);
      if (selectedCar) {
        setAutoSelectedCar(selectedCar);
        form.setValue('selectedCarId', selectedCar.id);
      }
    } else {
      setAutoSelectedCar(null);
      form.setValue('selectedCarId', '');
    }
  }, [availableCarsForDates, form]);

  const onSubmit = async (data: ReservationForm) => {
    setIsSubmitting(true);

    try {
      // Buscar o carro selecionado
      const selectedCarData = carsWithLastUse?.find(car => car.id === data.selectedCarId);
      
      if (!selectedCarData) {
        toast.error('Carro selecionado não encontrado');
        return;
      }
      
      // Verificar se o carro está disponível nas datas
      const isAvailable = availableCarsForDates.find(car => car.id === data.selectedCarId);
      
      if (!isAvailable) {
        toast.error('Carro selecionado não está disponível para as datas escolhidas');
        return;
      }
      
      setSelectedCar(selectedCarData);

      // Buscar o conductor_id baseado no nome do condutor
      const selectedConductor = conductors?.find(c => c.name === data.driver);
      
      if (!selectedConductor) {
        toast.error('Condutor selecionado não encontrado');
        return;
      }

      // Persistir no Supabase
      const cleanDestinations = Array.from(
        new Set((data.destinations || []).map((d) => (d || '').trim()).filter(Boolean))
      );

      const reservationData = {
        car_id: selectedCarData.id,
        conductor_id: selectedConductor.id,
        start_date: dateToLocalString(data.pickupDate),
        end_date: dateToLocalString(data.returnDate),
        destination: cleanDestinations.join(', ') || 'Não informado',
        driver_name: data.driver,
        car: selectedCarData?.plate || 'Desconhecido',
        pickup_date: dateToLocalString(data.pickupDate),
        return_date: dateToLocalString(data.returnDate),
        destinations: cleanDestinations,
        companions: data.companions || [],
        status: 'ativa'
      };

      const { data: newReservation, error } = await supabase
        .from('reservations')
        .insert(reservationData)
        .select()
        .single();

      if (error) throw error;

      // Enviar email de confirmação
      try {
        const emailData = {
          conductorName: data.driver,
          conductorEmail: data.driverEmail || '',
          carModel: `${selectedCarData.brand} ${selectedCarData.model}`,
          carPlate: selectedCarData.plate,
          startDate: formatDateObjectForDisplay(data.pickupDate),
          endDate: formatDateObjectForDisplay(data.returnDate),
          destination: cleanDestinations.join(', ') || 'Não informado',
          companions: data.companions || [],
          reservationId: newReservation.id.toString()
        };

        const emailResult = await sendReservationConfirmationEmail(emailData);
        
        if (emailResult.success) {
          toast.success(`Reserva confirmada! Carro ${selectedCarData?.plate} foi reservado e email de confirmação enviado.`);
        } else {
          console.error('Erro ao enviar email:', emailResult.error);
          toast.success(`Reserva confirmada! Carro ${selectedCarData?.plate} foi reservado. (Email não enviado: ${emailResult.error})`);
        }
      } catch (emailError) {
        console.error('Erro no envio de email:', emailError);
        toast.success(`Reserva confirmada! Carro ${selectedCarData?.plate} foi reservado. (Erro no envio do email)`);
      }

      // Resetar formulário após sucesso
      form.reset({
        selectedCarId: '',
        driver: '',
        driverEmail: '',
        companions: [],
        destinations: [''],
        pickupDate: undefined,
        returnDate: undefined
      });
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast.error('Ocorreu um erro ao salvar sua reserva. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Car className="h-6 w-6 text-primary" />
          Reserva de Veículo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pickupDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Data de Retirada
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              formatDateObjectForDisplay(field.value)
                            ) : (
                              <span>Selecionar data</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => !isDateFromToday(date)}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="returnDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Data de Entrega
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              formatDateObjectForDisplay(field.value)
                            ) : (
                              <span>Selecionar data</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => !isDateFromToday(date)}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

<FormField
  control={form.control}
  name="destinations"
  render={({ field }) => (
    <FormItem>
      <FormLabel className="flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        Destino(s) da Viagem
      </FormLabel>
      <FormControl>
        <MultiDestinationField value={field.value || ['']} onChange={field.onChange} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>

            {/* Carro Sorteado Automaticamente */}
            {watchedPickupDate && watchedReturnDate && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Car className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-lg text-blue-800">Veículo Selecionado Automaticamente</h3>
                  </div>
                  
                  {carsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Selecionando melhor veículo...</p>
                    </div>
                  ) : carsError ? (
                    <div className="text-center py-6">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-600 font-medium mb-2">❌ Erro ao carregar veículos</p>
                        <p className="text-sm text-red-500">Verifique sua conexão e tente novamente</p>
                        <button 
                          onClick={() => window.location.reload()} 
                          className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                        >
                          Tentar Novamente
                        </button>
                      </div>
                    </div>
                  ) : autoSelectedCar ? (
                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-xl text-gray-800">{autoSelectedCar.model}</h4>
                        <span className="text-lg font-bold text-blue-600">{autoSelectedCar.plate}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                        <p><strong>Cor:</strong> {autoSelectedCar.color}</p>
                        <p><strong>Ano:</strong> {autoSelectedCar.year}</p>
                        <p><strong>Quilometragem:</strong> {autoSelectedCar.current_km?.toLocaleString()} km</p>
                        <p><strong>Status:</strong> {autoSelectedCar.status}</p>
                      </div>
                      
                      <div className="pt-3 border-t border-gray-100">
                        {autoSelectedCar.last_use_date ? (
                          <div className="text-sm">
                            <p className="text-gray-600 mb-1">Último uso:</p>
                            <p className={`font-medium ${
                              autoSelectedCar.days_since_last_use && autoSelectedCar.days_since_last_use > 14
                                ? 'text-red-600'
                                : autoSelectedCar.days_since_last_use && autoSelectedCar.days_since_last_use > 7
                                ? 'text-orange-600'
                                : 'text-green-600'
                            }`}>
                              {autoSelectedCar.days_since_last_use === 0
                                ? 'Hoje'
                                : autoSelectedCar.days_since_last_use === 1
                                ? '1 dia atrás'
                                : `${autoSelectedCar.days_since_last_use} dias atrás`
                              }
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              ✓ Selecionado por estar há mais tempo sem uso
                            </p>
                          </div>
                        ) : (
                          <div className="text-sm">
                            <p className="text-green-600 font-medium">Nunca utilizado</p>
                            <p className="text-xs text-gray-500 mt-1">
                              ✓ Selecionado por nunca ter sido usado
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : availableCarsForDates.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-red-600 font-medium">Nenhum veículo disponível para as datas selecionadas</p>
                      <p className="text-sm text-gray-500 mt-1">Tente selecionar outras datas</p>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-gray-600">Aguardando seleção automática...</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="driver"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    Condutor Principal
                    {conductorsLoading && (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                    )}
                  </FormLabel>
                  {conductorsError ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-600 text-sm font-medium mb-1">❌ Erro ao carregar condutores</p>
                      <p className="text-xs text-red-500">Verifique sua conexão e tente novamente</p>
                      <button 
                        onClick={() => window.location.reload()} 
                        className="mt-2 px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                      >
                        Tentar Novamente
                      </button>
                    </div>
                  ) : (
                    <Select onValueChange={field.onChange} value={field.value || ""} disabled={conductorsLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={conductorsLoading ? "Carregando condutores..." : "Selecione o condutor"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {conductors?.map((conductor) => (
                          <SelectItem key={conductor.id} value={conductor.name}>
                            {conductor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="driverEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email do Condutor</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="email@empresa.com" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="companions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Acompanhantes
                  </FormLabel>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {availableCompanions.map((conductor) => (
                      <div key={conductor.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={conductor.id}
                          checked={field.value?.includes(conductor.name) || false}
                          onCheckedChange={(checked) => {
                            const current = field.value || [];
                            if (checked) {
                              field.onChange([...current, conductor.name]);
                            } else {
                              field.onChange(current.filter(p => p !== conductor.name));
                            }
                          }}
                        />
                        <label
                          htmlFor={conductor.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {conductor.name}
                        </label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />



            <div className="pt-6 border-t">
              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processando Reserva...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-5 w-5" />
                    Confirmar Reserva
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>

        {selectedCar && (
          <div className="mt-6 p-4 bg-gradient-to-r from-green-100 to-blue-100 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-lg mb-2 text-green-800">✅ Reserva Confirmada!</h3>
            <div className="space-y-1 text-sm">
              <p><strong>Placa:</strong> {selectedCar.plate}</p>
              <p><strong>Modelo:</strong> {selectedCar.model}</p>
              <p><strong>Quilometragem atual:</strong> {selectedCar.current_km?.toLocaleString()} km</p>
              <p className="text-green-700 mt-2 font-medium">
                🎯 Veículo selecionado automaticamente por estar há mais tempo sem uso.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};