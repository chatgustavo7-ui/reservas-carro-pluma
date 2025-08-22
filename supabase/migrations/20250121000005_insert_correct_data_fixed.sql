-- Limpar dados existentes e inserir dados corretos

-- Limpar tabelas na ordem correta (respeitando foreign keys)
DELETE FROM reservation_companions;
DELETE FROM km_records;
DELETE FROM maintenance_records;
DELETE FROM reservations;
DELETE FROM conductors;
DELETE FROM cars;

-- Inserir carros corretos (usando 'status' em vez de 'is_available')
INSERT INTO cars (id, model, brand, plate, current_km, last_revision_km, next_revision_km, status, color, year, next_maintenance_km) VALUES
(gen_random_uuid(), 'T-Cross', 'Volkswagen', 'TMA3I25', 0, 0, 10000, 'disponível', 'Branco', 2023, 10000),
(gen_random_uuid(), 'T-Cross', 'Volkswagen', 'TMB1H54', 0, 0, 10000, 'disponível', 'Branco', 2023, 10000);

-- Inserir condutores corretos (usando 'active' em vez de 'is_active')
INSERT INTO conductors (id, name, email, active) VALUES
(gen_random_uuid(), 'Paulo H.', 'paulo.henrique@belloalimentos.com.br', true),
(gen_random_uuid(), 'Eduardo S.', 'eduardo.sawasaki@belloalimentos.com.br', true),
(gen_random_uuid(), 'Maycon A.', 'maycon.azevedo@belloalimentos.com.br', true),
(gen_random_uuid(), 'Guilherme T.', 'guilherme.tamanho@belloalimentos.com.br', true),
(gen_random_uuid(), 'Rejeane M.', 'rejeane.mezzalira@belloalimentos.com.br', true),
(gen_random_uuid(), 'Ayeska A.', 'aryanne.andrade@belloalimentos.com.br', true),
(gen_random_uuid(), 'Francisco S.', 'francisco.santos@belloalimentos.com.br', true),
(gen_random_uuid(), 'João C.', 'joao.marcos@belloalimentos.com.br', true),
(gen_random_uuid(), 'Martielo O.', 'martielo.oliveira@belloalimentos.com.br', true),
(gen_random_uuid(), 'Gustavo C.', 'gustavo.camargo@plumaagro.com.br', true);

-- Conceder permissões para as tabelas
GRANT ALL PRIVILEGES ON cars TO authenticated;
GRANT ALL PRIVILEGES ON conductors TO authenticated;
GRANT SELECT ON cars TO anon;
GRANT SELECT ON conductors TO anon;