-- Adicionar campo de margem de quilometragem para revisão
-- Data: 2025-01-21
-- Descrição: Adiciona campo km_margin na tabela cars para permitir margem de segurança na quilometragem de revisão

-- Adicionar campo km_margin na tabela cars
ALTER TABLE cars 
ADD COLUMN km_margin INTEGER DEFAULT 2000 NOT NULL;

-- Comentário para documentação
COMMENT ON COLUMN cars.km_margin IS 'Margem de quilometragem em KM que permite uso do veículo após a quilometragem de revisão programada';

-- Atualizar carros existentes com margem padrão de 2000 km
UPDATE cars 
SET km_margin = 2000 
WHERE km_margin IS NULL;

-- Criar função para verificar se o carro pode ser usado considerando a margem
CREATE OR REPLACE FUNCTION can_use_car_with_margin(current_km_value INTEGER, next_revision_km_value INTEGER, km_margin_value INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  -- Retorna true se o carro ainda pode ser usado (considerando a margem)
  RETURN current_km_value <= (next_revision_km_value + km_margin_value);
END;
$$ LANGUAGE plpgsql;

-- Criar função para obter status de manutenção considerando margem
CREATE OR REPLACE FUNCTION get_maintenance_status_with_margin(current_km_value INTEGER, next_revision_km_value INTEGER, km_margin_value INTEGER)
RETURNS TEXT AS $$
BEGIN
  -- Se passou da margem, bloquear uso
  IF current_km_value > (next_revision_km_value + km_margin_value) THEN
    RETURN 'BLOQUEADO_MARGEM';
  -- Se passou da revisão mas ainda dentro da margem
  ELSIF current_km_value > next_revision_km_value THEN
    RETURN 'REVISÃO_VENCIDA_MARGEM';
  -- Se está próximo da revisão (500km)
  ELSIF (next_revision_km_value - current_km_value) <= 500 THEN
    RETURN 'REVISÃO_PRÓXIMA';
  -- Se está se aproximando da revisão (1000km)
  ELSIF (next_revision_km_value - current_km_value) <= 1000 THEN
    RETURN 'REVISÃO_APROXIMANDO';
  -- Caso contrário, está OK
  ELSE
    RETURN 'OK';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Atualizar view ou função existente se houver
-- (Será atualizada nos próximos passos conforme necessário)

-- Conceder permissões
GRANT SELECT, UPDATE ON cars TO authenticated;
GRANT SELECT ON cars TO anon;