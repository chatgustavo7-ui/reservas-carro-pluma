import React from 'react';
import { Button } from '@/components/ui/button';
import { DestinationAutocomplete } from '@/components/DestinationAutocomplete';

type MultiDestinationFieldProps = {
  value: string[];
  onChange: (value: string[]) => void;
};

export const MultiDestinationField: React.FC<MultiDestinationFieldProps> = ({ value, onChange }) => {
  const destinations = Array.isArray(value) && value.length > 0 ? value : [''];

  const updateAt = (index: number, next: string) => {
    const copy = [...destinations];
    copy[index] = next;
    onChange(copy);
  };

  const canAdd = destinations.some((d) => (d || '').trim().length > 0);

  return (
    <div className="space-y-3">
      {destinations.map((d, idx) => (
        <div key={idx} className="w-full">
          <DestinationAutocomplete
            value={d}
            onChange={(val) => updateAt(idx, val)}
          />
        </div>
      ))}

      {canAdd && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => onChange([...destinations, ''])}
        >
          Adicionar destino
        </Button>
      )}
    </div>
  );
};
