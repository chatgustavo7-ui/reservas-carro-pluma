-- Adicionar campos faltantes nas tabelas

-- Adicionar campos de manutenção na tabela cars se não existirem
ALTER TABLE cars 
ADD COLUMN IF NOT EXISTS next_maintenance_km INTEGER DEFAULT 10000;

ALTER TABLE cars 
ADD COLUMN IF NOT EXISTS color VARCHAR(50) DEFAULT 'Branco';

ALTER TABLE cars 
ADD COLUMN IF NOT EXISTS year INTEGER DEFAULT 2023;

-- Atualizar carros existentes com valores padrão
UPDATE cars 
SET 
  next_maintenance_km = COALESCE(next_maintenance_km, current_km + 10000),
  color = COALESCE(color, 'Branco'),
  year = COALESCE(year, 2023)
WHERE next_maintenance_km IS NULL OR color IS NULL OR year IS NULL;

-- Adicionar campos faltantes na tabela reservations se não existirem
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;

-- Garantir que as permissões estão corretas
GRANT ALL PRIVILEGES ON cars TO authenticated;
GRANT ALL PRIVILEGES ON cars TO anon;
GRANT ALL PRIVILEGES ON reservations TO authenticated;
GRANT ALL PRIVILEGES ON reservations TO anon;
GRANT ALL PRIVILEGES ON conductors TO authenticated;
GRANT ALL PRIVILEGES ON conductors TO anon;