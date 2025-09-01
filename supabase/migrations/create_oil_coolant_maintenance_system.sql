-- Sistema completo de alertas de manutenção para óleo e fluido de arrefecimento
-- Data: 2025-01-21
-- Descrição: Implementa sistema flexível de alertas baseado em quilometragem e tempo

-- 1. Criar tabela de tipos de manutenção
CREATE TABLE IF NOT EXISTS maintenance_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- 'oil', 'coolant', 'general'
  default_km_interval INTEGER, -- Intervalo padrão em KM
  default_time_interval_months INTEGER, -- Intervalo padrão em meses
  min_km_interval INTEGER, -- Mínimo configurável
  max_km_interval INTEGER, -- Máximo configurável
  min_time_interval_months INTEGER, -- Mínimo configurável
  max_time_interval_months INTEGER, -- Máximo configurável
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Inserir tipos de manutenção padrão
INSERT INTO maintenance_types (name, description, category, default_km_interval, default_time_interval_months, min_km_interval, max_km_interval, min_time_interval_months, max_time_interval_months) VALUES
('Checagem de Óleo', 'Verificação do nível e qualidade do óleo do motor', 'oil', 1000, 1, 500, 2000, 1, 2),
('Troca de Óleo', 'Substituição completa do óleo do motor e filtro', 'oil', 7500, 6, 5000, 10000, 3, 12),
('Checagem de Fluido de Arrefecimento', 'Verificação do nível do fluido de arrefecimento', 'coolant', 5000, 1, 2000, 10000, 1, 3),
('Troca de Fluido de Arrefecimento', 'Substituição completa do fluido de arrefecimento', 'coolant', 40000, 24, 30000, 50000, 18, 36);

-- 3. Criar tabela de configurações de manutenção por veículo
CREATE TABLE IF NOT EXISTS vehicle_maintenance_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  maintenance_type_id UUID NOT NULL REFERENCES maintenance_types(id) ON DELETE CASCADE,
  km_interval INTEGER NOT NULL,
  time_interval_months INTEGER NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(car_id, maintenance_type_id)
);

-- 4. Criar tabela de histórico de manutenções específicas
CREATE TABLE IF NOT EXISTS maintenance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  maintenance_type_id UUID NOT NULL REFERENCES maintenance_types(id) ON DELETE CASCADE,
  maintenance_date DATE NOT NULL,
  km_at_maintenance INTEGER NOT NULL,
  next_due_km INTEGER NOT NULL,
  next_due_date DATE NOT NULL,
  description TEXT,
  cost DECIMAL(10,2),
  performed_by VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Criar view para status de manutenção de óleo e fluido
CREATE OR REPLACE VIEW vehicle_maintenance_status AS
SELECT 
  c.id as car_id,
  c.plate,
  c.model,
  c.brand,
  c.current_km,
  mt.id as maintenance_type_id,
  mt.name as maintenance_type,
  mt.category,
  COALESCE(vmc.km_interval, mt.default_km_interval) as km_interval,
  COALESCE(vmc.time_interval_months, mt.default_time_interval_months) as time_interval_months,
  COALESCE(vmc.is_enabled, true) as is_enabled,
  
  -- Última manutenção
  mh.maintenance_date as last_maintenance_date,
  mh.km_at_maintenance as last_maintenance_km,
  mh.next_due_km,
  mh.next_due_date,
  
  -- Cálculos de status
  CASE 
    WHEN mh.maintenance_date IS NULL THEN c.current_km -- Primeira vez
    ELSE GREATEST(0, COALESCE(mh.next_due_km, c.current_km + COALESCE(vmc.km_interval, mt.default_km_interval)) - c.current_km)
  END as km_until_due,
  
  CASE 
    WHEN mh.maintenance_date IS NULL THEN CURRENT_DATE + INTERVAL '1 month' * COALESCE(vmc.time_interval_months, mt.default_time_interval_months)
    ELSE mh.next_due_date
  END as calculated_next_due_date,
  
  -- Status baseado em KM
  CASE 
    WHEN mh.maintenance_date IS NULL AND c.current_km >= COALESCE(vmc.km_interval, mt.default_km_interval) THEN 'VENCIDO_KM'
    WHEN mh.maintenance_date IS NOT NULL AND c.current_km >= mh.next_due_km THEN 'VENCIDO_KM'
    WHEN mh.maintenance_date IS NULL AND c.current_km >= (COALESCE(vmc.km_interval, mt.default_km_interval) - 500) THEN 'URGENTE_KM'
    WHEN mh.maintenance_date IS NOT NULL AND c.current_km >= (mh.next_due_km - 500) THEN 'URGENTE_KM'
    WHEN mh.maintenance_date IS NULL AND c.current_km >= (COALESCE(vmc.km_interval, mt.default_km_interval) - 1000) THEN 'PROXIMO_KM'
    WHEN mh.maintenance_date IS NOT NULL AND c.current_km >= (mh.next_due_km - 1000) THEN 'PROXIMO_KM'
    ELSE 'OK_KM'
  END as km_status,
  
  -- Status baseado em tempo
  CASE 
    WHEN mh.maintenance_date IS NULL AND CURRENT_DATE >= (CURRENT_DATE + INTERVAL '1 month' * COALESCE(vmc.time_interval_months, mt.default_time_interval_months)) THEN 'VENCIDO_TEMPO'
    WHEN mh.maintenance_date IS NOT NULL AND CURRENT_DATE >= mh.next_due_date THEN 'VENCIDO_TEMPO'
    WHEN mh.maintenance_date IS NULL AND CURRENT_DATE >= (CURRENT_DATE + INTERVAL '1 month' * COALESCE(vmc.time_interval_months, mt.default_time_interval_months) - INTERVAL '15 days') THEN 'URGENTE_TEMPO'
    WHEN mh.maintenance_date IS NOT NULL AND CURRENT_DATE >= (mh.next_due_date - INTERVAL '15 days') THEN 'URGENTE_TEMPO'
    WHEN mh.maintenance_date IS NULL AND CURRENT_DATE >= (CURRENT_DATE + INTERVAL '1 month' * COALESCE(vmc.time_interval_months, mt.default_time_interval_months) - INTERVAL '30 days') THEN 'PROXIMO_TEMPO'
    WHEN mh.maintenance_date IS NOT NULL AND CURRENT_DATE >= (mh.next_due_date - INTERVAL '30 days') THEN 'PROXIMO_TEMPO'
    ELSE 'OK_TEMPO'
  END as time_status,
  
  -- Status geral (pior caso entre KM e tempo)
  CASE 
    WHEN (mh.maintenance_date IS NULL AND c.current_km >= COALESCE(vmc.km_interval, mt.default_km_interval)) 
      OR (mh.maintenance_date IS NOT NULL AND c.current_km >= mh.next_due_km)
      OR (mh.maintenance_date IS NULL AND CURRENT_DATE >= (CURRENT_DATE + INTERVAL '1 month' * COALESCE(vmc.time_interval_months, mt.default_time_interval_months)))
      OR (mh.maintenance_date IS NOT NULL AND CURRENT_DATE >= mh.next_due_date) THEN 'VENCIDO'
    WHEN (mh.maintenance_date IS NULL AND c.current_km >= (COALESCE(vmc.km_interval, mt.default_km_interval) - 500))
      OR (mh.maintenance_date IS NOT NULL AND c.current_km >= (mh.next_due_km - 500))
      OR (mh.maintenance_date IS NULL AND CURRENT_DATE >= (CURRENT_DATE + INTERVAL '1 month' * COALESCE(vmc.time_interval_months, mt.default_time_interval_months) - INTERVAL '15 days'))
      OR (mh.maintenance_date IS NOT NULL AND CURRENT_DATE >= (mh.next_due_date - INTERVAL '15 days')) THEN 'URGENTE'
    WHEN (mh.maintenance_date IS NULL AND c.current_km >= (COALESCE(vmc.km_interval, mt.default_km_interval) - 1000))
      OR (mh.maintenance_date IS NOT NULL AND c.current_km >= (mh.next_due_km - 1000))
      OR (mh.maintenance_date IS NULL AND CURRENT_DATE >= (CURRENT_DATE + INTERVAL '1 month' * COALESCE(vmc.time_interval_months, mt.default_time_interval_months) - INTERVAL '30 days'))
      OR (mh.maintenance_date IS NOT NULL AND CURRENT_DATE >= (mh.next_due_date - INTERVAL '30 days')) THEN 'PROXIMO'
    ELSE 'OK'
  END as overall_status
  
FROM cars c
CROSS JOIN maintenance_types mt
LEFT JOIN vehicle_maintenance_config vmc ON c.id = vmc.car_id AND mt.id = vmc.maintenance_type_id
LEFT JOIN LATERAL (
  SELECT *
  FROM maintenance_history mh2
  WHERE mh2.car_id = c.id AND mh2.maintenance_type_id = mt.id
  ORDER BY mh2.maintenance_date DESC
  LIMIT 1
) mh ON true
WHERE mt.is_active = true
AND (vmc.is_enabled IS NULL OR vmc.is_enabled = true)
ORDER BY c.plate, mt.category, mt.name;

-- 6. Função para inicializar configurações padrão para um veículo
CREATE OR REPLACE FUNCTION initialize_vehicle_maintenance_config(vehicle_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO vehicle_maintenance_config (car_id, maintenance_type_id, km_interval, time_interval_months)
  SELECT 
    vehicle_id,
    mt.id,
    mt.default_km_interval,
    mt.default_time_interval_months
  FROM maintenance_types mt
  WHERE mt.is_active = true
  ON CONFLICT (car_id, maintenance_type_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 7. Função para registrar manutenção realizada
CREATE OR REPLACE FUNCTION register_maintenance(
  p_car_id UUID,
  p_maintenance_type_id UUID,
  p_maintenance_date DATE,
  p_km_at_maintenance INTEGER,
  p_description TEXT DEFAULT NULL,
  p_cost DECIMAL DEFAULT NULL,
  p_performed_by VARCHAR DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_km_interval INTEGER;
  v_time_interval_months INTEGER;
  v_next_due_km INTEGER;
  v_next_due_date DATE;
  v_maintenance_id UUID;
BEGIN
  -- Buscar configuração do veículo
  SELECT 
    COALESCE(vmc.km_interval, mt.default_km_interval),
    COALESCE(vmc.time_interval_months, mt.default_time_interval_months)
  INTO v_km_interval, v_time_interval_months
  FROM maintenance_types mt
  LEFT JOIN vehicle_maintenance_config vmc ON mt.id = vmc.maintenance_type_id AND vmc.car_id = p_car_id
  WHERE mt.id = p_maintenance_type_id;
  
  -- Calcular próximas datas
  v_next_due_km := p_km_at_maintenance + v_km_interval;
  v_next_due_date := p_maintenance_date + INTERVAL '1 month' * v_time_interval_months;
  
  -- Inserir registro
  INSERT INTO maintenance_history (
    car_id, maintenance_type_id, maintenance_date, km_at_maintenance,
    next_due_km, next_due_date, description, cost, performed_by, notes
  ) VALUES (
    p_car_id, p_maintenance_type_id, p_maintenance_date, p_km_at_maintenance,
    v_next_due_km, v_next_due_date, p_description, p_cost, p_performed_by, p_notes
  ) RETURNING id INTO v_maintenance_id;
  
  RETURN v_maintenance_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger para inicializar configurações ao criar novo veículo
CREATE OR REPLACE FUNCTION trigger_initialize_vehicle_maintenance()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM initialize_vehicle_maintenance_config(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_car_insert_maintenance_config
  AFTER INSERT ON cars
  FOR EACH ROW
  EXECUTE FUNCTION trigger_initialize_vehicle_maintenance();

-- 9. Inicializar configurações para veículos existentes
DO $$
DECLARE
  car_record RECORD;
BEGIN
  FOR car_record IN SELECT id FROM cars LOOP
    PERFORM initialize_vehicle_maintenance_config(car_record.id);
  END LOOP;
END
$$;

-- 10. Conceder permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON maintenance_types TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON maintenance_types TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON vehicle_maintenance_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON vehicle_maintenance_config TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON maintenance_history TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON maintenance_history TO authenticated;

GRANT SELECT ON vehicle_maintenance_status TO anon;
GRANT SELECT ON vehicle_maintenance_status TO authenticated;

-- 11. Comentários para documentação
COMMENT ON TABLE maintenance_types IS 'Tipos de manutenção disponíveis (óleo, fluido, etc.)';
COMMENT ON TABLE vehicle_maintenance_config IS 'Configurações específicas de manutenção por veículo';
COMMENT ON TABLE maintenance_history IS 'Histórico de manutenções realizadas';
COMMENT ON VIEW vehicle_maintenance_status IS 'Status atual de todas as manutenções por veículo';

COMMENT ON FUNCTION initialize_vehicle_maintenance_config(UUID) IS 'Inicializa configurações padrão de manutenção para um veículo';
COMMENT ON FUNCTION register_maintenance(UUID, UUID, DATE, INTEGER, TEXT, DECIMAL, VARCHAR, TEXT) IS 'Registra uma manutenção realizada e calcula próximas datas';