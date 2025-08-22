-- Adicionar campo para rastrear última utilização dos carros
ALTER TABLE cars ADD COLUMN last_used_date TIMESTAMP WITH TIME ZONE;

-- Comentário explicativo
COMMENT ON COLUMN cars.last_used_date IS 'Data da última utilização do carro para algoritmo de sorteio inteligente';

-- Atualizar carros existentes com data atual para evitar NULL
UPDATE cars SET last_used_date = NOW() WHERE last_used_date IS NULL;

-- Criar função para atualizar automaticamente a quilometragem e data de uso
CREATE OR REPLACE FUNCTION update_car_after_trip_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar quilometragem e data de última utilização do carro
  UPDATE cars 
  SET 
    current_km = NEW.end_km,
    last_used_date = NOW(),
    updated_at = NOW()
  WHERE id = NEW.car_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar automaticamente quando uma reserva for completada
DROP TRIGGER IF EXISTS trigger_update_car_after_trip ON reservations;
CREATE TRIGGER trigger_update_car_after_trip
  AFTER UPDATE OF status ON reservations
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.end_km IS NOT NULL)
  EXECUTE FUNCTION update_car_after_trip_completion();

-- Criar função para algoritmo de sorteio inteligente
CREATE OR REPLACE FUNCTION get_smart_car_lottery(
  p_exclude_plates TEXT[] DEFAULT '{}'
)
RETURNS TABLE(
  car_id UUID,
  plate VARCHAR,
  model VARCHAR,
  days_since_last_use INTEGER,
  priority_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.plate,
    c.model,
    COALESCE(EXTRACT(DAY FROM NOW() - c.last_used_date)::INTEGER, 999) as days_since_last_use,
    -- Fórmula de prioridade: mais dias sem uso = maior prioridade
    CASE 
      WHEN c.last_used_date IS NULL THEN 1000.0
      ELSE EXTRACT(DAY FROM NOW() - c.last_used_date)::NUMERIC + RANDOM() * 0.1
    END as priority_score
  FROM cars c
  WHERE 
    c.status = 'disponível'
    AND NOT (c.plate = ANY(p_exclude_plates))
  ORDER BY priority_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Criar função para obter estatísticas de uso da frota
CREATE OR REPLACE FUNCTION get_fleet_usage_stats()
RETURNS TABLE(
  total_cars INTEGER,
  available_cars INTEGER,
  cars_in_use INTEGER,
  cars_in_maintenance INTEGER,
  avg_days_since_use NUMERIC,
  cars_idle_over_7_days INTEGER,
  cars_idle_over_30_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_cars,
    COUNT(*) FILTER (WHERE status = 'disponível')::INTEGER as available_cars,
    COUNT(*) FILTER (WHERE status = 'em uso')::INTEGER as cars_in_use,
    COUNT(*) FILTER (WHERE status = 'manutenção')::INTEGER as cars_in_maintenance,
    AVG(COALESCE(EXTRACT(DAY FROM NOW() - last_used_date), 0))::NUMERIC as avg_days_since_use,
    COUNT(*) FILTER (WHERE EXTRACT(DAY FROM NOW() - last_used_date) > 7)::INTEGER as cars_idle_over_7_days,
    COUNT(*) FILTER (WHERE EXTRACT(DAY FROM NOW() - last_used_date) > 30)::INTEGER as cars_idle_over_30_days
  FROM cars;
END;
$$ LANGUAGE plpgsql;