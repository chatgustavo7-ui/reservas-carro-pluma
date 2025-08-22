-- Criar tabela para registrar o log dos alertas de manutenção enviados
CREATE TABLE IF NOT EXISTS maintenance_alerts_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('urgent', 'warning', 'info')),
  km_at_alert INTEGER NOT NULL,
  km_until_maintenance INTEGER NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_maintenance_alerts_log_car_id ON maintenance_alerts_log(car_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_alerts_log_sent_at ON maintenance_alerts_log(sent_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_alerts_log_alert_type ON maintenance_alerts_log(alert_type);

-- Habilitar RLS
ALTER TABLE maintenance_alerts_log ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura para usuários autenticados
CREATE POLICY "Allow read access for authenticated users" ON maintenance_alerts_log
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para permitir inserção para usuários autenticados
CREATE POLICY "Allow insert for authenticated users" ON maintenance_alerts_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Conceder permissões para as roles
GRANT SELECT, INSERT ON maintenance_alerts_log TO authenticated;
GRANT SELECT, INSERT ON maintenance_alerts_log TO anon;

-- Comentários para documentação
COMMENT ON TABLE maintenance_alerts_log IS 'Log dos alertas de manutenção enviados para controle de frequência';
COMMENT ON COLUMN maintenance_alerts_log.car_id IS 'ID do carro que recebeu o alerta';
COMMENT ON COLUMN maintenance_alerts_log.alert_type IS 'Tipo do alerta: urgent (vencido), warning (próximo), info (se aproximando)';
COMMENT ON COLUMN maintenance_alerts_log.km_at_alert IS 'Quilometragem do carro no momento do alerta';
COMMENT ON COLUMN maintenance_alerts_log.km_until_maintenance IS 'Quilômetros restantes até a manutenção (pode ser negativo se vencido)';
COMMENT ON COLUMN maintenance_alerts_log.sent_at IS 'Data e hora do envio do alerta';