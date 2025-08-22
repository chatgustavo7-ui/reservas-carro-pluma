import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { withRetry } from '@/integrations/supabase/retryUtils';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Car, MapPin, User, Filter, Download } from 'lucide-react';

import { formatDateObjectForDisplay, formatDateTimeForDisplay } from '@/utils/dateUtils';

interface Reservation {
  id: string;
  start_date: string;
  end_date: string;
  destination: string;
  status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  cars: {
    plate: string;
    model: string;
  };
  conductors: {
    name: string;
    email: string;
  };
}

const Dashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const { data: reservations, isLoading, error } = useQuery({
    queryKey: ['reservations', searchTerm, statusFilter, dateFilter],
    queryFn: async () => {
      let query = supabase
        .from('reservations')
        .select(`
          *,
          cars (plate, model),
          conductors (name, email)
        `)
        .order('start_date', { ascending: true });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchTerm) {
        query = query.or(`destination.ilike.%${searchTerm}%,cars.plate.ilike.%${searchTerm}%,conductors.name.ilike.%${searchTerm}%`);
      }

      // Filtro de data
      if (dateFilter !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (dateFilter) {
          case 'today': {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            query = query.gte('start_date', today.toISOString()).lt('start_date', tomorrow.toISOString());
            break;
          }
          case 'week': {
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 7);
            query = query.gte('start_date', weekStart.toISOString()).lt('start_date', weekEnd.toISOString());
            break;
          }
          case 'month': {
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            query = query.gte('start_date', monthStart.toISOString()).lt('start_date', monthEnd.toISOString());
            break;
          }
        }
      }

      const result = await withRetry.select(() => query);
      if (result.error) throw result.error;
      return result.data as Reservation[];
    },
    retry: false // Retry é feito pelo withRetry
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmada';
      case 'in_progress':
        return 'Em Andamento';
      case 'completed':
        return 'Concluída';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const exportToCSV = () => {
    if (!reservations) return;

    const headers = ['Data Início', 'Data Fim', 'Destino', 'Condutor', 'Carro', 'Status'];
    const csvContent = [
      headers.join(','),
      ...reservations.map(reservation => [
        formatDateObjectForDisplay(new Date(reservation.start_date)),
        formatDateObjectForDisplay(new Date(reservation.end_date)),
        reservation.destination,
        reservation.conductors.name,
        `${reservation.cars.model} - ${reservation.cars.plate}`,
        getStatusText(reservation.status)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reservas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (error) {
    return (
      <Layout title="Dashboard de Reservas">
        <div className="text-center py-8">
          <p className="text-red-600">Erro ao carregar reservas: {error.message}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard de Reservas">
      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Buscar por destino, condutor ou placa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Select value={statusFilter || ""} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="confirmed">Confirmada</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={dateFilter || ""} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Períodos</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Esta Semana</SelectItem>
                  <SelectItem value="month">Este Mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button onClick={exportToCSV} className="w-full" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Reservas */}
      {isLoading ? (
        <div className="text-center py-8">
          <p>Carregando reservas...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reservations && reservations.length > 0 ? (
            reservations.map((reservation) => (
              <Card key={reservation.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium">
                          {formatDateObjectForDisplay(new Date(reservation.start_date))}
                        </p>
                        <p className="text-sm text-gray-500">
                          até {formatDateObjectForDisplay(new Date(reservation.end_date))}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium">{reservation.destination}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium">{reservation.conductors.name}</p>
                        <p className="text-sm text-gray-500">{reservation.conductors.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Car className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium">{reservation.cars.model}</p>
                        <p className="text-sm text-gray-500">{reservation.cars.plate}</p>
                      </div>
                    </div>
                    
                    <div>
                      <Badge className={getStatusColor(reservation.status)}>
                        {getStatusText(reservation.status)}
                      </Badge>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        Criada em {formatDateTimeForDisplay(new Date(reservation.created_at))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">Nenhuma reserva encontrada.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </Layout>
  );
};

export default Dashboard;