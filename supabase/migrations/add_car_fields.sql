-- Adicionar campos observations e last_maintenance na tabela cars
ALTER TABLE cars 
ADD COLUMN IF NOT EXISTS observations TEXT,
ADD COLUMN IF NOT EXISTS last_maintenance DATE;

-- Atualizar o constraint de status para incluir 'lavar'
ALTER TABLE cars 
DROP CONSTRAINT IF EXISTS cars_status_check;

ALTER TABLE cars 
ADD CONSTRAINT cars_status_check 
CHECK (status::text = ANY (ARRAY['disponível'::character varying, 'em uso'::character varying, 'manutenção'::character varying, 'indisponível'::character varying, 'lavar'::character varying]::text[]));

-- Comentários para documentação
COMMENT ON COLUMN cars.observations IS 'Observações gerais sobre o carro';
COMMENT ON COLUMN cars.last_maintenance IS 'Data da última manutenção realizada';