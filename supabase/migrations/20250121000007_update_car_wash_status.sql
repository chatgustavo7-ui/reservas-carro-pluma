-- Atualizar função RPC para implementar lógica de lavagem
-- O carro vai para status 'lavar' no dia seguinte e fica 1 dia no lavacar

CREATE OR REPLACE FUNCTION update_car_post_trip(p_car_id UUID)
RETURNS void AS $$
BEGIN
    -- Atualizar status do carro para 'lavar' (será enviado para lavagem no dia seguinte)
    UPDATE cars 
    SET status = 'lavar',
        updated_at = NOW()
    WHERE id = p_car_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para tornar carros disponíveis novamente após 1 dia no lavacar
CREATE OR REPLACE FUNCTION make_cars_available_after_wash()
RETURNS void AS $$
BEGIN
    UPDATE cars 
    SET status = 'disponível', 
        updated_at = NOW()
    WHERE id IN (
        SELECT DISTINCT r.car_id
        FROM reservations r
        WHERE r.status = 'completed'
        AND r.end_date + INTERVAL '2 days' <= CURRENT_DATE  -- 1 dia para ir ao lavacar + 1 dia no lavacar
        AND EXISTS (
            SELECT 1 FROM cars c 
            WHERE c.id = r.car_id 
            AND c.status = 'lavar'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissões para as funções
GRANT EXECUTE ON FUNCTION update_car_post_trip(UUID) TO anon;
GRANT EXECUTE ON FUNCTION update_car_post_trip(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION make_cars_available_after_wash() TO anon;
GRANT EXECUTE ON FUNCTION make_cars_available_after_wash() TO authenticated;