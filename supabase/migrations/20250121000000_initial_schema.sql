-- Sistema de Reservas de Carros Empresariais - Grupo Pluma
-- Estrutura inicial do banco de dados

-- Create cars table
CREATE TABLE cars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plate VARCHAR(10) UNIQUE NOT NULL,
    model VARCHAR(50) NOT NULL DEFAULT 'T-Cross',
    brand VARCHAR(50) NOT NULL DEFAULT 'Volkswagen',
    current_km INTEGER NOT NULL DEFAULT 0,
    last_revision_km INTEGER NOT NULL DEFAULT 0,
    next_revision_km INTEGER NOT NULL DEFAULT 10000,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conductors table
CREATE TABLE conductors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reservations table
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    car_id UUID NOT NULL REFERENCES cars(id),
    conductor_id UUID NOT NULL REFERENCES conductors(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    destination VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'in_progress', 'completed', 'cancelled')),
    start_km INTEGER,
    end_km INTEGER,
    km_informed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reservation companions table
CREATE TABLE reservation_companions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    conductor_id UUID NOT NULL REFERENCES conductors(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(reservation_id, conductor_id)
);

-- Create maintenance records table
CREATE TABLE maintenance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    car_id UUID NOT NULL REFERENCES cars(id),
    type VARCHAR(50) NOT NULL CHECK (type IN ('washing', 'revision', 'repair', 'other')),
    maintenance_date DATE NOT NULL,
    km_at_maintenance INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create km records table
CREATE TABLE km_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    car_id UUID NOT NULL REFERENCES cars(id),
    reservation_id UUID REFERENCES reservations(id),
    previous_km INTEGER NOT NULL,
    current_km INTEGER NOT NULL,
    km_driven INTEGER GENERATED ALWAYS AS (current_km - previous_km) STORED,
    record_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_cars_plate ON cars(plate);
CREATE INDEX idx_cars_availability ON cars(is_available);
CREATE INDEX idx_conductors_email ON conductors(email);
CREATE INDEX idx_conductors_active ON conductors(is_active);
CREATE INDEX idx_reservations_car_id ON reservations(car_id);
CREATE INDEX idx_reservations_conductor_id ON reservations(conductor_id);
CREATE INDEX idx_reservations_dates ON reservations(start_date, end_date);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_km_informed ON reservations(km_informed);
CREATE INDEX idx_companions_reservation_id ON reservation_companions(reservation_id);
CREATE INDEX idx_companions_conductor_id ON reservation_companions(conductor_id);
CREATE INDEX idx_maintenance_car_id ON maintenance_records(car_id);
CREATE INDEX idx_maintenance_date ON maintenance_records(maintenance_date);
CREATE INDEX idx_maintenance_type ON maintenance_records(type);
CREATE INDEX idx_km_records_car_id ON km_records(car_id);
CREATE INDEX idx_km_records_reservation_id ON km_records(reservation_id);
CREATE INDEX idx_km_records_date ON km_records(record_date);

-- Insert initial cars data
INSERT INTO cars (plate, current_km, last_revision_km, next_revision_km) VALUES
('TMA3I25', 45000, 40000, 50000),
('TMB1H54', 32000, 30000, 40000);

-- Insert initial conductors data
INSERT INTO conductors (name, email) VALUES
('Paulo H.', 'paulo.henrique@grupopluma.com.br'),
('Eduardo S.', 'eduardo.sawasaki@grupopluma.com.br'),
('Maycon A.', 'maycon.azevedo@grupopluma.com.br'),
('Guilherme T.', 'guilherme.tamanho@grupopluma.com.br'),
('Rejeane M.', 'rejeane.mezzalira@grupopluma.com.br'),
('Ayeska A.', 'aryanne.andrade@grupopluma.com.br'),
('Francisco S.', 'francisco.santos@grupopluma.com.br'),
('Joao C.', 'joao.marcos@grupopluma.com.br'),
('Martielo O.', 'martielo.oliveira@grupopluma.com.br'),
('Gustavo C.', 'gustavo.camargo@plumaagro.com.br');

-- Function to check car availability
CREATE OR REPLACE FUNCTION check_car_availability(
    p_car_id UUID,
    p_start_date DATE,
    p_end_date DATE
) RETURNS BOOLEAN AS $$
BEGIN
    -- Check if car exists and is available
    IF NOT EXISTS (SELECT 1 FROM cars WHERE id = p_car_id AND is_available = true) THEN
        RETURN false;
    END IF;
    
    -- Check for overlapping reservations
    IF EXISTS (
        SELECT 1 FROM reservations 
        WHERE car_id = p_car_id 
        AND status IN ('confirmed', 'in_progress')
        AND (
            (start_date <= p_end_date AND end_date >= p_start_date)
            OR (end_date + INTERVAL '2 days' >= p_start_date AND end_date <= p_end_date)
        )
    ) THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to update car availability after trip
CREATE OR REPLACE FUNCTION update_car_post_trip()
RETURNS TRIGGER AS $$
BEGIN
    -- When km is informed, make car unavailable for 2 days
    IF NEW.km_informed = true AND OLD.km_informed = false THEN
        UPDATE cars 
        SET is_available = false 
        WHERE id = NEW.car_id;
        
        -- Update car's current km
        IF NEW.end_km IS NOT NULL THEN
            UPDATE cars 
            SET current_km = NEW.end_km,
                updated_at = NOW()
            WHERE id = NEW.car_id;
            
            -- Create km record
            INSERT INTO km_records (car_id, reservation_id, previous_km, current_km)
            VALUES (NEW.car_id, NEW.id, COALESCE(NEW.start_km, 0), NEW.end_km);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_car_post_trip
    AFTER UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_car_post_trip();

-- Function to make cars available again after 2 days
CREATE OR REPLACE FUNCTION make_cars_available()
RETURNS void AS $$
BEGIN
    UPDATE cars 
    SET is_available = true, updated_at = NOW()
    WHERE id IN (
        SELECT DISTINCT r.car_id
        FROM reservations r
        WHERE r.km_informed = true
        AND r.end_date + INTERVAL '2 days' <= CURRENT_DATE
        AND EXISTS (SELECT 1 FROM cars c WHERE c.id = r.car_id AND c.is_available = false)
    );
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE conductors ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_companions ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE km_records ENABLE ROW LEVEL SECURITY;

-- Grant permissions to anon role (read-only)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant full permissions to authenticated role
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create policies for anon access (since we don't use authentication)
CREATE POLICY "Allow all operations for anon" ON cars FOR ALL TO anon USING (true);
CREATE POLICY "Allow all operations for anon" ON conductors FOR ALL TO anon USING (true);
CREATE POLICY "Allow all operations for anon" ON reservations FOR ALL TO anon USING (true);
CREATE POLICY "Allow all operations for anon" ON reservation_companions FOR ALL TO anon USING (true);
CREATE POLICY "Allow all operations for anon" ON maintenance_records FOR ALL TO anon USING (true);
CREATE POLICY "Allow all operations for anon" ON km_records FOR ALL TO anon USING (true);