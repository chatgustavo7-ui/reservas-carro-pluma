-- Desabilitar RLS temporariamente para debug
ALTER TABLE conductors DISABLE ROW LEVEL SECURITY;
ALTER TABLE cars DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_companions DISABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE km_records DISABLE ROW LEVEL SECURITY;

-- Garantir que as permissões estão corretas
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;