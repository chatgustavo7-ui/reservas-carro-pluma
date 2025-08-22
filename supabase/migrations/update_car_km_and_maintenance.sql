-- Atualizar quilometragens corretas dos carros e configurar sistema de manutenção
-- Data: 2025-01-21
-- Descrição: Atualiza km atual dos carros e calcula próximas revisões

-- Atualizar quilometragem do carro TMA3I21 para 6.395 km
UPDATE cars 
SET 
  current_km = 6395,
  -- Calcular próxima revisão: próximo múltiplo de 10.000
  next_revision_km = 10000,
  next_maintenance_km = 10000,
  -- Se já passou da primeira revisão, ajustar
  last_revision_km = 0,
  updated_at = now()
WHERE plate = 'TMA3I21';

-- Atualizar quilometragem do carro TMB1H54 para 9.735 km
-- Este carro está próximo da revisão (faltam apenas 265 km)
UPDATE cars 
SET 
  current_km = 9735,
  -- Próxima revisão aos 10.000 km
  next_revision_km = 10000,
  next_maintenance_km = 10000,
  last_revision_km = 0,
  updated_at = now()
WHERE plate = 'TMB1H54';

-- Criar função para calcular próxima revisão automaticamente
CREATE OR REPLACE FUNCTION calculate_next_revision(current_km_value INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- Calcular o próximo múltiplo de 10.000
  RETURN ((current_km_value / 10000) + 1) * 10000;
END;
$$ LANGUAGE plpgsql;

-- Criar função para verificar se carro precisa de revisão urgente
CREATE OR REPLACE FUNCTION needs_urgent_maintenance(current_km_value INTEGER, next_revision_km_value INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  -- Retorna true se faltam menos de 500 km para a revisão
  RETURN (next_revision_km_value - current_km_value) <= 500;
END;
$$ LANGUAGE plpgsql;

-- Criar função para obter status de manutenção
CREATE OR REPLACE FUNCTION get_maintenance_status(current_km_value INTEGER, next_revision_km_value INTEGER)
RETURNS TEXT AS $$
DECLARE
  km_remaining INTEGER;
BEGIN
  km_remaining := next_revision_km_value - current_km_value;
  
  IF km_remaining <= 0 THEN
    RETURN 'REVISÃO_VENCIDA';
  ELSIF km_remaining <= 200 THEN
    RETURN 'REVISÃO_URGENTE';
  ELSIF km_remaining <= 500 THEN
    RETURN 'REVISÃO_PRÓXIMA';
  ELSE
    RETURN 'OK';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Criar view para facilitar consultas de manutenção
CREATE OR REPLACE VIEW cars_maintenance_status AS
SELECT 
  c.*,
  (c.next_revision_km - c.current_km) as km_to_revision,
  needs_urgent_maintenance(c.current_km, c.next_revision_km) as needs_urgent_maintenance,
  get_maintenance_status(c.current_km, c.next_revision_km) as maintenance_status,
  CASE 
    WHEN (c.next_revision_km - c.current_km) <= 0 THEN 'Revisão vencida'
    WHEN (c.next_revision_km - c.current_km) <= 200 THEN 'Revisão urgente'
    WHEN (c.next_revision_km - c.current_km) <= 500 THEN 'Revisão próxima'
    ELSE 'Em dia'
  END as maintenance_alert
FROM cars c
WHERE c.current_km IS NOT NULL;

-- Comentários sobre o status atual:
-- TMA3I21: 6.395 km - Próxima revisão aos 10.000 km (faltam 3.605 km)
-- TMB1H54: 9.735 km - Próxima revisão aos 10.000 km (faltam apenas 265 km) - ATENÇÃO!