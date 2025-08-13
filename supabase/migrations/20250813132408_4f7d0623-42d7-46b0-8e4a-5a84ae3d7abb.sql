-- Drop all existing tables and related objects
DROP TABLE IF EXISTS public.reservations CASCADE;
DROP FUNCTION IF EXISTS public.set_reservation_status() CASCADE;

-- Create the reservations table with proper structure
CREATE TABLE public.reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_name TEXT NOT NULL,
    companions TEXT[] NOT NULL DEFAULT '{}',
    car TEXT NOT NULL,
    pickup_date DATE NOT NULL,
    return_date DATE NOT NULL,
    destinations TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'ativa',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT reservations_status_check CHECK (status IN ('ativa', 'concluída', 'cancelada'))
);

-- Create indexes for better performance
CREATE INDEX idx_reservations_driver_name ON public.reservations (driver_name);
CREATE INDEX idx_reservations_car ON public.reservations (car);
CREATE INDEX idx_reservations_pickup_date ON public.reservations (pickup_date);
CREATE INDEX idx_reservations_return_date ON public.reservations (return_date);
CREATE INDEX idx_reservations_destinations ON public.reservations USING gin (destinations);

-- Enable Row Level Security
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Reservations are viewable by everyone"
    ON public.reservations FOR SELECT
    USING (true);

CREATE POLICY "Anyone can insert reservations"
    ON public.reservations FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can update reservations"
    ON public.reservations FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anyone can delete reservations"
    ON public.reservations FOR DELETE
    USING (true);

-- Create function to auto-set status based on return date
CREATE OR REPLACE FUNCTION public.set_reservation_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'cancelada' THEN
        RETURN NEW; -- Honor explicit cancellation
    END IF;

    IF NEW.return_date < CURRENT_DATE THEN
        NEW.status := 'concluída';
    ELSE
        NEW.status := COALESCE(NEW.status, 'ativa');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to automatically set status
CREATE TRIGGER trg_set_reservation_status
    BEFORE INSERT OR UPDATE ON public.reservations
    FOR EACH ROW EXECUTE FUNCTION public.set_reservation_status();