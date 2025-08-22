-- Recreate cars and conductors tables that were removed

-- Create cars table
CREATE TABLE IF NOT EXISTS public.cars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model TEXT NOT NULL,
    plate TEXT UNIQUE NOT NULL,
    color TEXT NOT NULL,
    year INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'disponível',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT cars_status_check CHECK (status IN ('disponível', 'em uso', 'manutenção'))
);

-- Create conductors table
CREATE TABLE IF NOT EXISTS public.conductors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conductors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for cars
CREATE POLICY "Cars are viewable by everyone"
    ON public.cars FOR SELECT
    USING (true);

CREATE POLICY "Anyone can insert cars"
    ON public.cars FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can update cars"
    ON public.cars FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anyone can delete cars"
    ON public.cars FOR DELETE
    USING (true);

-- Create RLS policies for conductors
CREATE POLICY "Conductors are viewable by everyone"
    ON public.conductors FOR SELECT
    USING (true);

CREATE POLICY "Anyone can insert conductors"
    ON public.conductors FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can update conductors"
    ON public.conductors FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anyone can delete conductors"
    ON public.conductors FOR DELETE
    USING (true);

-- Grant permissions to anon and authenticated roles
GRANT ALL PRIVILEGES ON public.cars TO anon;
GRANT ALL PRIVILEGES ON public.cars TO authenticated;
GRANT ALL PRIVILEGES ON public.conductors TO anon;
GRANT ALL PRIVILEGES ON public.conductors TO authenticated;

-- Insert car data
INSERT INTO public.cars (model, plate, color, year, status) VALUES
('T-Cross', 'TMA3I25', 'Branco', 2023, 'disponível'),
('T-Cross', 'TMB1H54', 'Prata', 2023, 'disponível')
ON CONFLICT (plate) DO NOTHING;

-- Insert conductor data
INSERT INTO public.conductors (name, email, active) VALUES
('Paulo H.', 'paulo.henrique@grupopluma.com.br', true),
('Eduardo S.', 'eduardo.sawasaki@grupopluma.com.br', true),
('Maycon A.', 'maycon.azevedo@grupopluma.com.br', true),
('Guilherme T.', 'guilherme.tamanho@grupopluma.com.br', true),
('Rejeane M.', 'rejeane.mezzalira@grupopluma.com.br', true),
('Ayeska A.', 'aryanne.andrade@grupopluma.com.br', true),
('Francisco S.', 'francisco.santos@grupopluma.com.br', true),
('Joao C.', 'joao.marcos@grupopluma.com.br', true),
('Martielo O.', 'martielo.oliveira@grupopluma.com.br', true),
('Gustavo C.', 'gustavo.camargo@plumaagro.com.br', true)
ON CONFLICT (email) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cars_plate ON public.cars (plate);
CREATE INDEX IF NOT EXISTS idx_cars_status ON public.cars (status);
CREATE INDEX IF NOT EXISTS idx_conductors_email ON public.conductors (email);
CREATE INDEX IF NOT EXISTS idx_conductors_active ON public.conductors (active);