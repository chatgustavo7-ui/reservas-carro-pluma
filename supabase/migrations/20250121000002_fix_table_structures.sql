-- Corrigir estrutura da tabela cars: renomear is_available para status
ALTER TABLE cars DROP COLUMN IF EXISTS is_available;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'disponível' CHECK (status IN ('disponível', 'em_uso', 'manutenção', 'indisponível'));

-- Atualizar todos os carros para status 'disponível'
UPDATE cars SET status = 'disponível';

-- Corrigir estrutura da tabela conductors: renomear is_active para active
ALTER TABLE conductors DROP COLUMN IF EXISTS is_active;
ALTER TABLE conductors ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Atualizar todos os condutores para ativo
UPDATE conductors SET active = true;

-- Garantir que os dados dos carros estejam corretos
DELETE FROM cars;
INSERT INTO cars (plate, model, brand, current_km, last_revision_km, next_revision_km, status) VALUES
('TMA3I25', 'T-Cross', 'Volkswagen', 15000, 10000, 20000, 'disponível'),
('TMB1H54', 'T-Cross', 'Volkswagen', 12000, 10000, 20000, 'disponível');

-- Garantir que os dados dos condutores estejam corretos
DELETE FROM conductors;
INSERT INTO conductors (name, email, active) VALUES
('Ana Paula Silva', 'ana.silva@grupopluma.com.br', true),
('Carlos Eduardo Santos', 'carlos.santos@grupopluma.com.br', true),
('Fernanda Costa Lima', 'fernanda.lima@grupopluma.com.br', true),
('João Pedro Oliveira', 'joao.oliveira@grupopluma.com.br', true),
('Mariana Rodrigues', 'mariana.rodrigues@grupopluma.com.br', true),
('Rafael Almeida', 'rafael.almeida@grupopluma.com.br', true),
('Juliana Ferreira', 'juliana.ferreira@grupopluma.com.br', true),
('Bruno Henrique', 'bruno.henrique@grupopluma.com.br', true),
('Camila Souza', 'camila.souza@grupopluma.com.br', true),
('Diego Martins', 'diego.martins@grupopluma.com.br', true);

-- Garantir permissões para as tabelas
GRANT ALL PRIVILEGES ON cars TO authenticated;
GRANT ALL PRIVILEGES ON conductors TO authenticated;
GRANT ALL PRIVILEGES ON reservations TO authenticated;
GRANT SELECT ON cars TO anon;
GRANT SELECT ON conductors TO anon;