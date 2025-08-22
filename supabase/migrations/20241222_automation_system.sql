-- Criar tabela para logs de automação
CREATE TABLE IF NOT EXISTS automation_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'email_sent', 'auto_completed', 'reminder_sent'
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar função para detectar reservas em atraso
CREATE OR REPLACE FUNCTION get_overdue_reservations()
RETURNS TABLE (
    reservation_id UUID,
    conductor_email VARCHAR,
    conductor_name VARCHAR,
    car_plate VARCHAR,
    return_date DATE,
    days_overdue INTEGER,
    last_email_sent TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id as reservation_id,
        c.email as conductor_email,
        c.name as conductor_name,
        r.car as car_plate,
        r.return_date,
        (CURRENT_DATE - r.return_date)::INTEGER as days_overdue,
        r.email_sent_at as last_email_sent
    FROM reservations r
    JOIN conductors c ON r.conductor_id = c.id
    WHERE 
        r.status IN ('confirmed', 'in_progress', 'ativa')
        AND r.return_date < CURRENT_DATE
        AND (r.km_informed = false OR r.km_informed IS NULL)
        AND c.active = true;
END;
$$ LANGUAGE plpgsql;

-- Criar função para finalizar automaticamente viagens em atraso
CREATE OR REPLACE FUNCTION auto_complete_overdue_reservations()
RETURNS TABLE (
    completed_reservation_id UUID,
    car_id UUID,
    conductor_name VARCHAR
) AS $$
DECLARE
    reservation_record RECORD;
BEGIN
    -- Buscar reservas que devem ser finalizadas automaticamente
    FOR reservation_record IN
        SELECT r.id, r.car_id, c.name as conductor_name, r.car
        FROM reservations r
        JOIN conductors c ON r.conductor_id = c.id
        WHERE 
            r.status IN ('confirmed', 'in_progress', 'ativa')
            AND r.return_date < CURRENT_DATE
            AND (r.km_informed = false OR r.km_informed IS NULL)
    LOOP
        -- Atualizar status da reserva para completed
        UPDATE reservations 
        SET 
            status = 'completed',
            km_informed = true,
            updated_at = NOW()
        WHERE id = reservation_record.id;
        
        -- Atualizar status do carro para 'lavar'
        UPDATE cars 
        SET 
            status = 'lavar',
            updated_at = NOW()
        WHERE id = reservation_record.car_id;
        
        -- Registrar log da ação automática
        INSERT INTO automation_logs (reservation_id, action_type, details)
        VALUES (
            reservation_record.id,
            'auto_completed',
            jsonb_build_object(
                'reason', 'overdue_auto_completion',
                'car_plate', reservation_record.car,
                'conductor_name', reservation_record.conductor_name
            )
        );
        
        -- Retornar informações da reserva finalizada
        completed_reservation_id := reservation_record.id;
        car_id := reservation_record.car_id;
        conductor_name := reservation_record.conductor_name;
        
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Criar função para registrar envio de email
CREATE OR REPLACE FUNCTION log_email_sent(
    p_reservation_id UUID,
    p_email_type VARCHAR DEFAULT 'reminder'
)
RETURNS VOID AS $$
BEGIN
    -- Atualizar timestamp do último email enviado na reserva
    UPDATE reservations 
    SET email_sent_at = NOW()
    WHERE id = p_reservation_id;
    
    -- Registrar log do email enviado
    INSERT INTO automation_logs (reservation_id, action_type, details)
    VALUES (
        p_reservation_id,
        'email_sent',
        jsonb_build_object(
            'email_type', p_email_type,
            'sent_at', NOW()
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Criar função para verificar se deve enviar email (evitar spam)
CREATE OR REPLACE FUNCTION should_send_email(
    p_reservation_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    last_email TIMESTAMP WITH TIME ZONE;
    hours_since_last_email INTEGER;
BEGIN
    -- Buscar último email enviado
    SELECT email_sent_at INTO last_email
    FROM reservations
    WHERE id = p_reservation_id;
    
    -- Se nunca enviou email, pode enviar
    IF last_email IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Calcular horas desde o último email
    hours_since_last_email := EXTRACT(EPOCH FROM (NOW() - last_email)) / 3600;
    
    -- Enviar apenas se passaram mais de 8 horas (3x por dia)
    RETURN hours_since_last_email >= 8;
END;
$$ LANGUAGE plpgsql;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_reservations_overdue 
ON reservations (return_date, status, km_informed);

CREATE INDEX IF NOT EXISTS idx_automation_logs_reservation 
ON automation_logs (reservation_id, action_type, created_at);

CREATE INDEX IF NOT EXISTS idx_reservations_email_sent 
ON reservations (email_sent_at) 
WHERE email_sent_at IS NOT NULL;