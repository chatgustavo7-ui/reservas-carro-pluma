-- Corrigir estrutura da tabela reservations para corresponder ao formulário

-- Primeiro, vamos adicionar as colunas que estão faltando
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS driver_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS car VARCHAR(255),
ADD COLUMN IF NOT EXISTS pickup_date DATE,
ADD COLUMN IF NOT EXISTS return_date DATE,
ADD COLUMN IF NOT EXISTS destinations TEXT[],
ADD COLUMN IF NOT EXISTS companions TEXT[];

-- Atualizar o campo status para aceitar 'ativa' como valor válido
ALTER TABLE public.reservations 
DROP CONSTRAINT IF EXISTS reservations_status_check;

ALTER TABLE public.reservations 
ADD CONSTRAINT reservations_status_check 
CHECK (status IN ('confirmed', 'in_progress', 'completed', 'cancelled', 'ativa'));

-- Tornar as novas colunas obrigatórias (exceto companions e destinations que podem ser vazios)
ALTER TABLE public.reservations 
ALTER COLUMN driver_name SET NOT NULL,
ALTER COLUMN car SET NOT NULL,
ALTER COLUMN pickup_date SET NOT NULL,
ALTER COLUMN return_date SET NOT NULL;

-- Verificar se as colunas foram criadas
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'reservations' 
ORDER BY ordinal_position;