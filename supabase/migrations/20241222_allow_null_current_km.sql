-- Permitir valores null na coluna current_km da tabela cars
ALTER TABLE cars ALTER COLUMN current_km DROP NOT NULL;

-- Atualizar carros que não têm reservas para ter current_km null
UPDATE cars 
SET current_km = NULL 
WHERE id NOT IN (
  SELECT DISTINCT car_id 
  FROM reservations 
  WHERE status IN ('completed', 'active')
);