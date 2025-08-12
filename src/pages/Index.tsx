import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CarReservationForm } from '@/components/CarReservationForm';
const Index = () => {
  return <div className="min-h-screen bg-background py-12">
      <div className="px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Reserve seu Veículo</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Preencha os dados abaixo e nosso sistema selecionará automaticamente 
              o melhor veículo disponível para sua viagem.
            </p>
            <div className="mt-4">
              <Button asChild>
                <Link to="/reservas" aria-label="Ver todas as reservas">Ver reservas</Link>
              </Button>
            </div>
          </div>
          
          <CarReservationForm />
          
          
        </div>
      </div>
    </div>;
};
export default Index;