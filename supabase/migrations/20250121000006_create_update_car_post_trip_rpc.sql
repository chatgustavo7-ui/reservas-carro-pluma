-- Criar função RPC para atualizar status do carro após finalização da viagem
-- Esta função marca o carro como indisponível por 2 dias após o retorno

CREATE OR REPLACE FUNCTION update_car_post_trip(p_car_id UUID)
RETURNS void AS $$
BEGIN
    -- Atualizar status do carro para indisponível
    UPDATE cars 
    SET status = 'indisponível',
        updated_at = NOW()
    WHERE id = p_car_id;
    
    -- Agendar para tornar o carro disponível novamente após 2 dias
    -- (isso será feito por uma função de limpeza automática ou job)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para tornar carros disponíveis novamente após 2 dias
CREATE OR REPLACE FUNCTION make_cars_available_after_trip()
RETURNS void AS $$
BEGIN
    UPDATE cars 
    SET status = 'disponível', 
        updated_at = NOW()
    WHERE id IN (
        SELECT DISTINCT r.car_id
        FROM reservations r
        WHERE r.status = 'completed'
        AND r.end_date + INTERVAL '2 days' <= CURRENT_DATE
        AND EXISTS (
            SELECT 1 FROM cars c 
            WHERE c.id = r.car_id 
            AND c.status = 'indisponível'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissões para as funções
GRANT EXECUTE ON FUNCTION update_car_post_trip(UUID) TO anon;
GRANT EXECUTE ON FUNCTION update_car_post_trip(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION make_cars_available_after_trip() TO anon;
GRANT EXECUTE ON FUNCTION make_cars_available_after_trip() TO authenticated;