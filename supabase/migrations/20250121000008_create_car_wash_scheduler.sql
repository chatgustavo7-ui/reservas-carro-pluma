-- Criar agendador para executar automaticamente a função make_cars_available_after_wash
-- Esta função será executada diariamente para verificar se algum carro deve sair do lavacar

-- Criar uma função que será chamada por um trigger ou job externo
CREATE OR REPLACE FUNCTION schedule_car_wash_cleanup()
RETURNS void AS $$
BEGIN
    -- Executar a função de limpeza
    PERFORM make_cars_available_after_wash();
    
    -- Log da execução (opcional)
    INSERT INTO car_status_logs (action, executed_at, details)
    VALUES ('wash_cleanup', NOW(), 'Executed automatic car wash cleanup');
EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro, apenas registrar (não falhar)
        INSERT INTO car_status_logs (action, executed_at, details, error)
        VALUES ('wash_cleanup_error', NOW(), 'Error during car wash cleanup', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar tabela de logs para rastrear execuções (se não existir)
CREATE TABLE IF NOT EXISTS car_status_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(50) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    details TEXT,
    error TEXT
);

-- Conceder permissões
GRANT EXECUTE ON FUNCTION schedule_car_wash_cleanup() TO anon;
GRANT EXECUTE ON FUNCTION schedule_car_wash_cleanup() TO authenticated;

-- Criar uma função RPC que pode ser chamada pelo frontend para executar manualmente
CREATE OR REPLACE FUNCTION manual_car_wash_cleanup()
RETURNS json AS $$
DECLARE
    cars_updated INTEGER;
BEGIN
    -- Contar quantos carros serão atualizados antes da execução
    SELECT COUNT(*) INTO cars_updated
    FROM cars 
    WHERE id IN (
        SELECT DISTINCT r.car_id
        FROM reservations r
        WHERE r.status = 'completed'
        AND r.end_date + INTERVAL '2 days' <= CURRENT_DATE
        AND EXISTS (
            SELECT 1 FROM cars c 
            WHERE c.id = r.car_id 
            AND c.status = 'lavar'
        )
    );
    
    -- Executar a limpeza
    PERFORM make_cars_available_after_wash();
    
    -- Retornar resultado
    RETURN json_build_object(
        'success', true,
        'cars_updated', cars_updated,
        'executed_at', NOW()
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'executed_at', NOW()
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissões para a função manual
GRANT EXECUTE ON FUNCTION manual_car_wash_cleanup() TO anon;
GRANT EXECUTE ON FUNCTION manual_car_wash_cleanup() TO authenticated;