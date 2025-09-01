-- Atualizar função get_smart_car_lottery para incluir parâmetros de data e verificação de margem
DROP FUNCTION IF EXISTS get_smart_car_lottery(TEXT[]);

-- Criar nova versão da função com parâmetros de data
CREATE OR REPLACE FUNCTION get_smart_car_lottery(
  start_date_param DATE,
  end_date_param DATE,
  p_exclude_plates TEXT[] DEFAULT '{}'
)
RETURNS TABLE(
  id UUID,
  plate VARCHAR,
  model VARCHAR,
  brand VARCHAR,
  current_km INTEGER,
  last_revision_km INTEGER,
  next_revision_km INTEGER,
  km_margin INTEGER,
  status VARCHAR,
  color VARCHAR,
  year INTEGER,
  next_maintenance_km INTEGER,
  last_used_date TIMESTAMP WITH TIME ZONE,
  days_since_last_use INTEGER,
  priority_score NUMERIC,
  can_use BOOLEAN,
  maintenance_status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.plate,
    c.model,
    c.brand,
    c.current_km,
    c.last_revision_km,
    c.next_revision_km,
    c.km_margin,
    c.status,
    c.color,
    c.year,
    c.next_maintenance_km,
    c.last_used_date,
    COALESCE(EXTRACT(DAY FROM NOW() - c.last_used_date)::INTEGER, 999) as days_since_last_use,
    -- Fórmula de prioridade: mais dias sem uso = maior prioridade
    CASE 
      WHEN c.last_used_date IS NULL THEN 1000.0
      ELSE EXTRACT(DAY FROM NOW() - c.last_used_date)::NUMERIC + RANDOM() * 0.1
    END as priority_score,
    -- Verificar se o carro pode ser usado considerando a margem
    can_use_car_with_margin(c.id) as can_use,
    -- Status de manutenção considerando a margem
    get_maintenance_status_with_margin(c.id) as maintenance_status
  FROM cars c
  WHERE 
    c.status = 'disponível'
    AND can_use_car_with_margin(c.id) = true  -- Só incluir carros que podem ser usados
    AND NOT (c.plate = ANY(p_exclude_plates))
    -- Verificar se não há conflitos de reserva no período
    AND NOT EXISTS (
      SELECT 1 FROM reservations r
      WHERE r.car = c.plate
        AND r.status IN ('ativa', 'em_andamento')
        AND (
          (r.pickup_date <= end_date_param AND r.return_date >= start_date_param)
        )
    )
  ORDER BY priority_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION get_smart_car_lottery(DATE, DATE, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_smart_car_lottery(DATE, DATE, TEXT[]) TO anon;

-- Comentário explicativo
COMMENT ON FUNCTION get_smart_car_lottery(DATE, DATE, TEXT[]) IS 'Função para seleção inteligente de carros disponíveis considerando margem de quilometragem e período de reserva';