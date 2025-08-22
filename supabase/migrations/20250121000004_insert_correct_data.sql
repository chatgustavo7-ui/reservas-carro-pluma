-- Limpar dados existentes e inserir dados corretos

-- Limpar tabelas na ordem correta (respeitando foreign keys)
DELETE FROM reservation_companions;
DELETE FROM km_records;
DELETE FROM maintenance_records;
DELETE FROM reservations;
DELETE FROM conductors;
DELETE FROM cars;

-- Inserir carros corretos
INSERT INTO cars (id, model, brand, plate, current_km, last_revision_km, next_revision_km, is_available) VALUES
(gen_random_uuid(), 'T-Cross', 'Volkswagen', 'TMA3I25', 0, 0, 10000, true),
(gen_random_uuid(), 'T-Cross', 'Volkswagen', 'TMB1H54', 0, 0, 10000, true);

-- Inserir condutores corretos (que também são acompanhantes)
INSERT INTO conductors (id, name, email, is_active) VALUES
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