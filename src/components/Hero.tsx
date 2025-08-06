import React from 'react';
import { Car, MapPin, Clock } from 'lucide-react';
import heroImage from '@/assets/hero-cars.jpg';

export const Hero = () => {
  return (
    <div className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          Sua próxima
          <span className="block bg-gradient-to-r from-travel-orange to-travel-blue bg-clip-text text-transparent">
            aventura
          </span>
          começa aqui
        </h1>
        
        <p className="text-xl md:text-2xl mb-8 text-gray-200 max-w-2xl mx-auto">
          Reserve seu veículo de forma simples e rápida. 
          Nosso sistema seleciona automaticamente o melhor carro disponível para sua viagem.
        </p>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="flex flex-col items-center p-6 bg-white/10 backdrop-blur-sm rounded-lg">
            <Car className="h-12 w-12 text-travel-orange mb-4" />
            <h3 className="text-lg font-semibold mb-2">Seleção Automática</h3>
            <p className="text-gray-300 text-center">
              Escolhemos o melhor veículo disponível para suas datas
            </p>
          </div>

          <div className="flex flex-col items-center p-6 bg-white/10 backdrop-blur-sm rounded-lg">
            <Clock className="h-12 w-12 text-travel-orange mb-4" />
            <h3 className="text-lg font-semibold mb-2">Reserva Rápida</h3>
            <p className="text-gray-300 text-center">
              Processo simples e rápido em poucos cliques
            </p>
          </div>

          <div className="flex flex-col items-center p-6 bg-white/10 backdrop-blur-sm rounded-lg">
            <MapPin className="h-12 w-12 text-travel-orange mb-4" />
            <h3 className="text-lg font-semibold mb-2">Qualquer Destino</h3>
            <p className="text-gray-300 text-center">
              Levamos você onde quiser ir com segurança
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};