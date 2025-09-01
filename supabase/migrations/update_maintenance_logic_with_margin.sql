-- Atualizar lógica de manutenção para incluir margem de segurança
-- Data: 2025-01-21
-- Descrição: Modifica funções de manutenção para considerar o campo km_margin

-- Atualizar função get_maintenance_status para incluir margem
CREATE OR REPLACE FUNCTION get_maintenance_status_with_margin(current_km_value INTEGER, next_revision_km_value INTEGER, km_margin_value INTEGER DEFAULT 2000)
RETURNS TEXT AS $$
DECLARE
  km_remaining INTEGER;
  km_with_margin INTEGER;
BEGIN
  km_remaining := next_revision_km_value - current_km_value;
  km_with_margin := next_revision_km_value + km_margin_value;
  
  -- Se passou da revisão + margem, está realmente vencida
  IF current_km_value > km_with_margin THEN
    RETURN 'REVISÃO_VENCIDA';
  -- Se passou da revisão mas ainda dentro da margem
  ELSIF current_km_value > next_revision_km_value THEN
    RETURN 'REVISÃO_VENCIDA_MARGEM';
  -- Se está próximo da revisão (500km)
  ELSIF km_remaining <= 500 THEN
    RETURN 'REVISÃO_PRÓXIMA';
  -- Se está se aproximando da revisão (1000km)
  ELSIF km_remaining <= 1000 THEN
    RETURN 'REVISÃO_APROXIMANDO';
  -- Caso contrário, está OK
  ELSE
    RETURN 'OK';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Atualizar função needs_urgent_maintenance para incluir margem
CREATE OR REPLACE FUNCTION needs_urgent_maintenance_with_margin(current_km_value INTEGER, next_revision_km_value INTEGER, km_margin_value INTEGER DEFAULT 2000)
RETURNS BOOLEAN AS $$
DECLARE
  km_with_margin INTEGER;
BEGIN
  km_with_margin := next_revision_km_value + km_margin_value;
  
  -- Retorna true se passou da revisão + margem (bloqueio real)
  RETURN current_km_value > km_with_margin;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar se o carro pode ser usado considerando a margem
CREATE OR REPLACE FUNCTION can_use_car_with_margin(current_km_value INTEGER, next_revision_km_value INTEGER, km_margin_value INTEGER DEFAULT 2000)
RETURNS BOOLEAN AS $$
DECLARE
  km_with_margin INTEGER;
BEGIN
  km_with_margin := next_revision_km_value + km_margin_value;
  
  -- Pode usar se não passou da revisão + margem
  RETURN current_km_value <= km_with_margin;
END;
$$ LANGUAGE plpgsql;

-- Remover view existente e recriar com nova estrutura
DROP VIEW IF EXISTS cars_maintenance_status;

-- Recriar view cars_maintenance_status para usar as novas funções
CREATE VIEW cars_maintenance_status AS
SELECT 
  c.*,
  (c.next_revision_km - c.current_km) as km_to_revision,
  (c.next_revision_km + COALESCE(c.km_margin, 2000) - c.current_km) as km_to_margin_limit,
  needs_urgent_maintenance_with_margin(c.current_km, c.next_revision_km, COALESCE(c.km_margin, 2000)) as needs_urgent_maintenance,
  get_maintenance_status_with_margin(c.current_km, c.next_revision_km, COALESCE(c.km_margin, 2000)) as maintenance_status,
  can_use_car_with_margin(c.current_km, c.next_revision_km, COALESCE(c.km_margin, 2000)) as can_use_car,
  CASE 
    WHEN c.current_km > (c.next_revision_km + COALESCE(c.km_margin, 2000)) THEN 'Bloqueado - Revisão vencida'
    WHEN c.current_km > c.next_revision_km THEN 'Atenção - Usando margem de segurança'
    WHEN (c.next_revision_km - c.current_km) <= 200 THEN 'Revisão urgente'
    WHEN (c.next_revision_km - c.current_km) <= 500 THEN 'Revisão próxima'
    ELSE 'Em dia'
  END as maintenance_alert
FROM cars c
WHERE c.current_km IS NOT NULL;

-- Conceder permissões
GRANT SELECT ON cars_maintenance_status TO anon;
GRANT SELECT ON cars_maintenance_status TO authenticated;

-- Comentários para documentação
COMMENT ON FUNCTION get_maintenance_status_with_margin IS 'Calcula status de manutenção considerando margem de segurança';
COMMENT ON FUNCTION needs_urgent_maintenance_with_margin IS 'Verifica se carro precisa manutenção urgente considerando margem';
COMMENT ON FUNCTION can_use_car_with_margin IS 'Verifica se carro pode ser usado considerando margem de segurança';
COMMENT ON VIEW cars_maintenance_status IS 'View com status de manutenção incluindo lógica de margem de segurança';