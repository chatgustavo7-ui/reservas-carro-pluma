import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CarReservationForm } from '@/components/CarReservationForm';
import { PendingKmBanner } from '@/components/PendingKmBanner';
import { MaintenanceAlerts } from '@/components/MaintenanceAlerts';
const Index = () => {
  const [currentDriver, setCurrentDriver] = useState<string>('');

  // Para demo, vamos usar o primeiro condutor como "usuário atual"
  // Em um app real, isso viria do sistema de autenticação
  useEffect(() => {
    setCurrentDriver('Eduardo S.'); // Simular usuário logado
  }, []);

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="px-4">
        <div className="max-w-6xl mx-auto">
          {/* Banner de KM pendente */}
          <PendingKmBanner driverName={currentDriver} />
          
          {/* Alertas de Manutenção */}
          <MaintenanceAlerts className="mb-6" />
          
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Reserve seu Veículo</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Preencha os dados abaixo e nosso sistema selecionará automaticamente 
              o melhor veículo disponível para sua viagem.
            </p>
            <div className="mt-4 flex gap-4 justify-center">
              <Button asChild>
                <Link to="/reservas" aria-label="Ver todas as reservas">Ver reservas</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/car-status" aria-label="Ver status dos carros">Status dos Carros</Link>
              </Button>
            </div>
          </div>
          
          <CarReservationForm />
        </div>
      </div>
    </div>
  );
};
export default Index;