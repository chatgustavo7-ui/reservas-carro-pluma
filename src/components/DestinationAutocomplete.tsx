import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { BRAZILIAN_CITIES } from '@/data/cities';

export type City = {
  city: string;
  state: string;
  label: string; // "Cidade - UF"
};

function normalize(text: string) {
  return (text || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

// Cache para evitar múltiplas requisições
let citiesCache: City[] | null = null;
let cachePromise: Promise<City[]> | null = null;

// Cache para dados
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos

type IBGEState = {
  id: number;
  sigla: string;
  nome: string;
};

type IBGECity = {
  id: number;
  nome: string;
  microrregiao: {
    mesorregiao: {
      UF: {
        id: number;
        sigla: string;
        nome: string;
      };
    };
  };
};

// Função para gerenciar cache
const getCachedData = (key: string) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key: string, data: unknown) => {
  cache.set(key, { data, timestamp: Date.now() });
};

// Função para buscar estados do IBGE
const fetchStates = async (): Promise<IBGEState[]> => {
  const cacheKey = 'ibge_states';
  const cached = getCachedData(cacheKey);
  if (cached) return cached as IBGEState[];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(
      'https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome',
      { 
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const states: IBGEState[] = await response.json();
    
    setCachedData(cacheKey, states);
    return states;
  } catch (error) {
    console.warn('Erro ao buscar estados do IBGE:', error);
    throw error;
  }
};

// Função para buscar municípios de um estado específico
const fetchCitiesByState = async (stateId: number, stateSigla: string): Promise<IBGECity[]> => {
  const cacheKey = `ibge_cities_${stateId}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached as IBGECity[];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const response = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateId}/municipios?orderBy=nome`,
      { 
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const cities: IBGECity[] = await response.json();
    
    setCachedData(cacheKey, cities);
    return cities;
  } catch (error) {
    console.warn(`Erro ao buscar cidades do estado ${stateId}:`, error);
    throw error;
  }
};

// Função para buscar cidades da API do IBGE
async function fetchCitiesFromIBGE(): Promise<City[]> {
  if (citiesCache) {
    return citiesCache;
  }

  if (cachePromise) {
    return cachePromise;
  }

  cachePromise = (async () => {
    try {
      // Buscar estados primeiro
      const states = await fetchStates();
      const allCities: City[] = [];

      // Processar estados em lotes para evitar sobrecarga
      const batchSize = 5;
      const stateBatches = [];
      for (let i = 0; i < states.length; i += batchSize) {
        stateBatches.push(states.slice(i, i + batchSize));
      }

      for (const batch of stateBatches) {
        const batchPromises = batch.map(async (state) => {
          try {
            const cities = await fetchCitiesByState(state.id, state.sigla);
            return cities.map(city => ({
              city: city.nome,
              state: state.sigla,
              label: `${city.nome} - ${state.sigla}`
            }));
          } catch (error) {
            console.warn(`Erro ao carregar cidades do estado ${state.nome}:`, error);
            return [];
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        const batchCities = batchResults
          .filter(result => result.status === 'fulfilled')
          .flatMap(result => (result as PromiseFulfilledResult<{ city: string; state: string; label: string; }[]>).value);

        allCities.push(...batchCities);

        // Pequena pausa entre lotes para evitar sobrecarga
        if (stateBatches.indexOf(batch) < stateBatches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Ordenar cidades alfabeticamente
      allCities.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
      
      citiesCache = allCities;
      console.log(`Carregadas ${allCities.length} cidades da API do IBGE`);
      return allCities;
    } catch (error) {
      console.error('Erro ao carregar cidades da API do IBGE:', error);
      // Fallback para dados locais em caso de erro
      citiesCache = BRAZILIAN_CITIES;
      return BRAZILIAN_CITIES;
    } finally {
      cachePromise = null;
    }
  })();

  return cachePromise;
}

type DestinationAutocompleteProps = {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export const DestinationAutocomplete: React.FC<DestinationAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'Ex: São Paulo - SP',
  className,
}) => {
  const [inputValue, setInputValue] = useState<string>(value || '');
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cities, setCities] = useState<City[]>(BRAZILIAN_CITIES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Carregar cidades da API do IBGE na inicialização
  useEffect(() => {
    const loadCities = async () => {
      setLoading(true);
      setError(null);
      try {
        const ibgeCities = await fetchCitiesFromIBGE();
        setCities(ibgeCities);
      } catch (err) {
        setError('Erro ao carregar cidades. Usando dados locais.');
        console.error('Erro ao carregar cidades:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCities();
  }, []);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Debounce para busca
  const debouncedSearch = useCallback((query: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setSearchQuery(query);
    }, 300);
  }, []);

  useEffect(() => {
    debouncedSearch(inputValue);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [inputValue, debouncedSearch]);

  const filtered = useMemo(() => {
    if (searchQuery.length < 3) return [];
    const q = normalize(searchQuery);
    return cities
      .filter((c) => normalize(c.label).includes(q))
      .slice(0, 20);
  }, [cities, searchQuery]);

  // Handlers para teclado
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown' && !open) {
      setOpen(true);
    }
  }, [open]);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        className={cn('w-full', className)}
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          if (e.target.value.length >= 3) {
            setOpen(true);
          } else {
            setOpen(false);
          }
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (inputValue.length >= 3) {
            setOpen(true);
          }
        }}
        onBlur={() => {
          // Pequeno delay para permitir clique nas opções
          setTimeout(() => setOpen(false), 200);
        }}
        placeholder={placeholder}
        aria-autocomplete="list"
        aria-expanded={open}
      />
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-md max-h-[300px] overflow-y-auto">
          {loading ? (
            <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              Carregando cidades...
            </div>
          ) : error ? (
            <div className="p-3 text-sm text-yellow-600">
              {error}
            </div>
          ) : searchQuery.length < 3 ? (
            <div className="p-3 text-sm text-muted-foreground">
              Digite pelo menos 3 letras... ({cities.length} cidades disponíveis)
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">
              Nenhuma cidade encontrada.
            </div>
          ) : (
            <div className="p-2">
              {filtered.map((c) => (
                <div
                  key={c.label}
                  className="px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-sm text-sm"
                  onClick={() => {
                    onChange(c.label);
                    setInputValue(c.label);
                    setOpen(false);
                    inputRef.current?.blur();
                  }}
                >
                  {c.label}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
