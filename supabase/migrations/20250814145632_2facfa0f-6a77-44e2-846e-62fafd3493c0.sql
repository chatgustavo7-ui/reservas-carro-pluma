-- Create drivers table for email management
CREATE TABLE public.drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    km_reminder_last_sent_on DATE NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add odometer columns and driver_email to reservations
ALTER TABLE public.reservations 
ADD COLUMN odometer_start_km INTEGER NULL,
ADD COLUMN odometer_end_km INTEGER NULL,
ADD COLUMN driver_email TEXT NULL,
ADD COLUMN email_sent_at TIMESTAMPTZ NULL;

-- Add comments for clarity
COMMENT ON COLUMN public.reservations.odometer_start_km IS 'KM na retirada do veículo (opcional)';
COMMENT ON COLUMN public.reservations.odometer_end_km IS 'KM na devolução do veículo (obrigatório após devolução)';
COMMENT ON COLUMN public.reservations.driver_email IS 'Snapshot do email do condutor no momento da reserva';
COMMENT ON COLUMN public.reservations.email_sent_at IS 'Data/hora do envio da confirmação de reserva';

-- Create indexes for better performance
CREATE INDEX idx_drivers_name ON public.drivers (name);
CREATE INDEX idx_drivers_email ON public.drivers (email);
CREATE INDEX idx_reservations_driver_email ON public.reservations (driver_email);
CREATE INDEX idx_reservations_odometer_end_km ON public.reservations (odometer_end_km);
CREATE INDEX idx_reservations_pending_km ON public.reservations (driver_name, return_date, odometer_end_km);

-- Enable RLS on drivers table
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for drivers table
CREATE POLICY "Drivers are viewable by everyone"
    ON public.drivers FOR SELECT
    USING (true);

CREATE POLICY "Anyone can insert drivers"
    ON public.drivers FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can update drivers"
    ON public.drivers FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anyone can delete drivers"
    ON public.drivers FOR DELETE
    USING (true);

-- Insert some sample drivers (optional)
INSERT INTO public.drivers (name, email) VALUES
('João Silva', 'joao.silva@empresa.com'),
('Maria Santos', 'maria.santos@empresa.com'),
('Carlos Oliveira', 'carlos.oliveira@empresa.com'),
('Ana Costa', 'ana.costa@empresa.com'),
('Pedro Souza', 'pedro.souza@empresa.com')
ON CONFLICT (name) DO NOTHING;