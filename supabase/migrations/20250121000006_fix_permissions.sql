-- Corrigir permissões para acesso às tabelas

-- Conceder permissões para a tabela conductors
GRANT ALL PRIVILEGES ON conductors TO authenticated;
GRANT SELECT ON conductors TO anon;

-- Conceder permissões para a tabela cars
GRANT ALL PRIVILEGES ON cars TO authenticated;
GRANT SELECT ON cars TO anon;

-- Conceder permissões para a tabela reservations
GRANT ALL PRIVILEGES ON reservations TO authenticated;
GRANT SELECT ON reservations TO anon;

-- Conceder permissões para a tabela reservation_companions
GRANT ALL PRIVILEGES ON reservation_companions TO authenticated;
GRANT SELECT ON reservation_companions TO anon;

-- Conceder permissões para a tabela maintenance_records
GRANT ALL PRIVILEGES ON maintenance_records TO authenticated;
GRANT SELECT ON maintenance_records TO anon;

-- Conceder permissões para a tabela km_records
GRANT ALL PRIVILEGES ON km_records TO authenticated;
GRANT SELECT ON km_records TO anon;

-- Verificar se RLS está habilitado e criar políticas básicas se necessário
-- Para conductors
DROP POLICY IF EXISTS "Enable read access for all users" ON conductors;
CREATE POLICY "Enable read access for all users" ON conductors FOR SELECT USING (true);

-- Para cars
DROP POLICY IF EXISTS "Enable read access for all users" ON cars;
CREATE POLICY "Enable read access for all users" ON cars FOR SELECT USING (true);

-- Para reservations
DROP POLICY IF EXISTS "Enable read access for all users" ON reservations;
CREATE POLICY "Enable read access for all users" ON reservations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON reservations;
CREATE POLICY "Enable insert access for all users" ON reservations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON reservations;
CREATE POLICY "Enable update access for all users" ON reservations FOR UPDATE USING (true);