import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

// Simple in-memory cache across component mounts
let citiesCache: City[] | null = null;

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

async function fetchBrazilianCities(): Promise<City[]> {
  if (citiesCache) return citiesCache;
  const res = await fetch(
    'https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome'
  );
  const data = await res.json();
  const mapped: City[] = (data || []).map((item: any) => {
    const uf = item?.microrregiao?.mesorregiao?.UF?.sigla || '';
    const nome = item?.nome || '';
    return {
      city: nome,
      state: uf,
      label: `${nome} - ${uf}`.trim(),
    } as City;
  });
  citiesCache = mapped;
  return mapped;
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
  const [cities, setCities] = useState<City[]>(citiesCache || []);
  const [loading, setLoading] = useState<boolean>(!citiesCache);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!citiesCache) {
      fetchBrazilianCities()
        .then((list) => {
          if (isMounted) {
            setCities(list);
            setLoading(false);
          }
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
    return () => {
      isMounted = false;
    };
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Input
          ref={inputRef}
          className={cn('w-full', className)}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (e.target.value.length >= 3) {
              setOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.length >= 3) {
              setOpen(true);
            }
          }}
          placeholder={placeholder}
          aria-autocomplete="list"
          aria-expanded={open}
        />
      </PopoverTrigger>
      {open && (
        <PopoverContent 
          onOpenAutoFocus={(e) => e.preventDefault()} 
          className="z-50 p-0 w-[var(--radix-popover-trigger-width)] max-h-[300px] overflow-y-auto"
          onInteractOutside={() => setOpen(false)}
        >
          <Command shouldFilter={false}>
            <CommandList>
              {loading ? (
                <div className="p-3 text-sm text-muted-foreground">Carregando...</div>
              ) : (
                <>
                  {searchQuery.length < 3 ? (
                    <div className="p-3 text-sm text-muted-foreground">Digite pelo menos 3 letras...</div>
                  ) : filtered.length === 0 ? (
                    <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
                  ) : (
                    <CommandGroup>
                      {filtered.map((c) => (
                        <CommandItem
                          key={c.label}
                          value={c.label}
                          onSelect={() => {
                            onChange(c.label);
                            setInputValue(c.label);
                            setOpen(false);
                            inputRef.current?.blur();
                          }}
                        >
                          {c.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      )}
    </Popover>
  );
};
