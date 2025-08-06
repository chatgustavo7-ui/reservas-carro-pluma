import React from 'react';
import { CarReservationForm } from '@/components/CarReservationForm';

const Index = () => {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Reserve seu Veículo</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Preencha os dados abaixo e nosso sistema selecionará automaticamente 
              o melhor veículo disponível para sua viagem.
            </p>
          </div>
          
          <CarReservationForm />
          
          <div className="mt-16 text-center">
            <h3 className="text-2xl font-semibold mb-6">Nossa Frota</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
                <h4 className="text-xl font-semibold mb-2 text-primary">TMA3I25</h4>
                <p className="text-muted-foreground mb-4">Veículo Executivo</p>
                <ul className="text-left space-y-2 text-sm">
                  <li>• Conforto premium</li>
                  <li>• Ideal para viagens executivas</li>
                  <li>• Ar condicionado</li>
                  <li>• GPS integrado</li>
                </ul>
              </div>
              
              <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
                <h4 className="text-xl font-semibold mb-2 text-primary">TMB1H54</h4>
                <p className="text-muted-foreground mb-4">Veículo Familiar</p>
                <ul className="text-left space-y-2 text-sm">
                  <li>• Espaço amplo</li>
                  <li>• Perfeito para famílias</li>
                  <li>• Porta-malas grande</li>
                  <li>• Segurança avançada</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
