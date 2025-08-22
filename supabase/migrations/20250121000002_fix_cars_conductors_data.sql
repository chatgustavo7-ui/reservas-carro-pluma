-- Migração para corrigir dados das tabelas cars e conductors
-- Data: 2025-01-21
-- Descrição: Limpar e inserir dados corretos dos condutores e carros

-- Limpar dados existentes
DELETE FROM public.cars;
DELETE FROM public.conductors;

-- Inserir carros corretos
INSERT INTO public.cars (plate, model, brand, current_km, last_revision_km, next_revision_km, is_available) VALUES
('TMA3I25', 'T-Cross', 'Volkswagen', 0, 0, 10000, true),
('TMB1H54', 'T-Cross', 'Volkswagen', 0, 0, 10000, true);

-- Inserir condutores corretos
INSERT INTO public.conductors (name, email, is_active) VALUES
('Paulo H.', 'paulo.henrique@belloalimentos.com.br', true),
('Eduardo S.', 'eduardo.sawasaki@belloalimentos.com.br', true),
('Maycon A.', 'maycon.azevedo@belloalimentos.com.br', true),
('Guilherme T.', 'guilherme.tamanho@belloalimentos.com.br', true),
('Rejeane M.', 'rejeane.mezzalira@belloalimentos.com.br', true),
('Ayeska A.', 'aryanne.andrade@belloalimentos.com.br', true),
('Francisco S.', 'francisco.santos@belloalimentos.com.br', true),
('João C.', 'joao.marcos@belloalimentos.com.br', true),
('Martielo O.', 'martielo.oliveira@belloalimentos.com.br', true),
('Gustavo C.', 'gustavo.camargo@plumaagro.com.br', true);

-- Verificar se os dados foram inseridos corretamente
SELECT 'Cars inserted:' as info, COUNT(*) as count FROM public.cars;
SELECT 'Conductors inserted:' as info, COUNT(*) as count FROM public.conductors;