import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Car, MapPin, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const cars = [
  { id: 'TMA3I25', name: 'TMA3I25', type: 'Executivo' },
  { id: 'TMB1H54', name: 'TMB1H54', type: 'Familiar' }
];

const reservationSchema = z.object({
  pickupDate: z.date({
    required_error: 'Data de retirada é obrigatória',
  }),
  returnDate: z.date({
    required_error: 'Data de entrega é obrigatória',
  }),
  destination: z.string().min(3, 'Destino deve ter pelo menos 3 caracteres'),
  companions: z.string().min(1, 'Número de acompanhantes é obrigatório'),
}).refine((data) => data.returnDate >= data.pickupDate, {
  message: 'Data de entrega deve ser posterior à data de retirada',
  path: ['returnDate'],
});

type ReservationForm = z.infer<typeof reservationSchema>;

const getAvailableCars = (pickupDate: Date, returnDate: Date) => {
  // Simulação de disponibilidade - em um sistema real seria uma API
  const isWeekend = pickupDate.getDay() === 0 || pickupDate.getDay() === 6;
  const availableCars = isWeekend ? cars : cars.filter(car => car.id === 'TMA3I25');
  return availableCars;
};

const selectRandomCar = (availableCars: typeof cars) => {
  if (availableCars.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * availableCars.length);
  return availableCars[randomIndex];
};

export const CarReservationForm = () => {
  const [selectedCar, setSelectedCar] = useState<typeof cars[0] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ReservationForm>({
    resolver: zodResolver(reservationSchema),
  });

  const onSubmit = async (data: ReservationForm) => {
    setIsSubmitting(true);
    
    try {
      const availableCars = getAvailableCars(data.pickupDate, data.returnDate);
      
      if (availableCars.length === 0) {
        toast({
          title: 'Não há carros disponíveis',
          description: 'Não encontramos carros disponíveis para as datas selecionadas.',
          variant: 'destructive',
        });
        return;
      }

      const randomCar = selectRandomCar(availableCars);
      setSelectedCar(randomCar);

      toast({
        title: 'Reserva confirmada!',
        description: `Carro ${randomCar?.name} foi reservado para sua viagem.`,
      });

      // Simular envio para backend
      console.log('Reserva criada:', {
        ...data,
        carId: randomCar?.id,
        carName: randomCar?.name,
      });

    } catch (error) {
      toast({
        title: 'Erro na reserva',
        description: 'Ocorreu um erro ao processar sua reserva. Tente novamente.',
        variant: 'destructive',
      });
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
                              format(field.value, "PPP", { locale: ptBR })
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
                          disabled={(date) => date < new Date()}
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
                              format(field.value, "PPP", { locale: ptBR })
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
                          disabled={(date) => date < new Date()}
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
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Destino da Viagem
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: São Paulo, SP" 
                      {...field} 
                      className="w-full"
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
                    Número de Acompanhantes
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0"
                      placeholder="0" 
                      {...field} 
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processando...' : 'Reservar Veículo'}
            </Button>
          </form>
        </Form>

        {selectedCar && (
          <div className="mt-6 p-4 bg-gradient-to-r from-travel-blue-light to-travel-orange-light rounded-lg">
            <h3 className="font-semibold text-lg mb-2">Reserva Confirmada!</h3>
            <div className="space-y-1 text-sm">
              <p><strong>Veículo:</strong> {selectedCar.name}</p>
              <p><strong>Tipo:</strong> {selectedCar.type}</p>
              <p className="text-muted-foreground mt-2">
                Seu veículo foi selecionado automaticamente entre os disponíveis.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};