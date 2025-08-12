import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
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
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  const filtered = useMemo(() => {
    const q = normalize(inputValue);
    if (!q) return cities.slice(0, 20);
    return cities
      .filter((c) => normalize(c.label).includes(q))
      .slice(0, 20);
  }, [cities, inputValue]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Input
          ref={inputRef}
          className={cn('w-full', className)}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          aria-autocomplete="list"
          aria-expanded={open}
        />
      </PopoverTrigger>
      <PopoverContent onOpenAutoFocus={(e) => e.preventDefault()} className="z-50 p-0 w-[var(--radix-popover-trigger-width)]">
        <Command shouldFilter={false}>
          <CommandInput
            value={inputValue}
            onValueChange={(v) => setInputValue(v)}
            placeholder="Buscar cidade..."
          />
          <CommandList>
            {loading ? (
              <div className="p-3 text-sm text-muted-foreground">Carregando...</div>
            ) : (
              <>
                <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
                <CommandGroup heading="Cidades">
                  {filtered.map((c) => (
                    <CommandItem
                      key={c.label}
                      value={c.label}
                      onSelect={() => {
                        onChange(c.label);
                        setInputValue(c.label);
                        setOpen(false);
                        // Remove refocus to avoid reopening popover via onFocus handler
                        // inputRef.current?.blur();
                      }}
                    >
                      {c.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
