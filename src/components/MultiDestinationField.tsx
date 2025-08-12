import React, { useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { DestinationAutocomplete } from '@/components/DestinationAutocomplete';
import { Badge } from '@/components/ui/badge';
import { X, GripVertical } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

type MultiDestinationFieldProps = {
  value: string[];
  onChange: (value: string[]) => void;
};

const normalize = (text: string) =>
  (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();

export const MultiDestinationField: React.FC<MultiDestinationFieldProps> = ({ value, onChange }) => {
  const destinations = Array.isArray(value) ? value : [];

  const dragIndex = useRef<number | null>(null);

  const nonEmpty = useMemo(
    () => destinations.filter((d) => (d || '').trim().length > 0),
    [destinations]
  );

  const updateAt = (index: number, next: string) => {
    const nextNorm = normalize(next);
    if (!nextNorm) return; // ignore empty

    const duplicateIndex = destinations.findIndex((d, i) => i !== index && normalize(d) === nextNorm);
    if (duplicateIndex !== -1) {
      toast({ title: 'Destino duplicado', description: 'Este destino já foi adicionado.' });
      return;
    }

    const copy = [...destinations];
    copy[index] = next;
    onChange(copy);
  };

  const removeAt = (index: number) => {
    const copy = destinations.filter((_, i) => i !== index);
    onChange(copy);
  };

  const addNew = () => {
    const canAdd = destinations.every((d) => normalize(d).length > 0);
    if (!canAdd) {
      toast({ title: 'Destino vazio', description: 'Preencha o destino atual antes de adicionar outro.' });
      return;
    }
    onChange([...destinations, '']);
  };

  const handleDragStart = (idx: number) => (e: React.DragEvent) => {
    dragIndex.current = idx;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from == null || from === idx) return;
    const copy = [...destinations];
    const [moved] = copy.splice(from, 1);
    copy.splice(idx, 0, moved);
    onChange(copy);
  };

  const canAddAnother = destinations.length === 0 || destinations.some((d) => (d || '').trim().length > 0);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {destinations.length === 0 && (
          <div className="w-full">
            <DestinationAutocomplete value={''} onChange={(val) => onChange([val])} />
          </div>
        )}

        {destinations.map((d, idx) => (
          <div
            key={idx}
            className="w-full flex items-center gap-2"
            draggable
            onDragStart={handleDragStart(idx)}
            onDragOver={handleDragOver}
            onDrop={handleDrop(idx)}
          >
            <span className="shrink-0 text-muted-foreground"><GripVertical className="h-4 w-4" /></span>
            <div className="flex-1">
              <DestinationAutocomplete value={d} onChange={(val) => updateAt(idx, val)} />
            </div>
            <Button type="button" variant="outline" onClick={() => removeAt(idx)} aria-label={`Remover destino ${idx + 1}`}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {canAddAnother && (
          <Button type="button" variant="secondary" onClick={addNew}>
            Adicionar destino
          </Button>
        )}
      </div>

      {nonEmpty.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {nonEmpty.map((d, i) => (
            <Badge key={`${d}-${i}`} variant="secondary" className="flex items-center gap-1">
              {d}
              <button
                type="button"
                onClick={() => removeAt(destinations.findIndex((x) => x === d))}
                aria-label={`Remover ${d}`}
                className="ml-1"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
