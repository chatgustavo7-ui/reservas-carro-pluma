-- Criar tabela para histórico de manutenções realizadas
CREATE TABLE IF NOT EXISTS maintenance_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    maintenance_type VARCHAR(50) NOT NULL CHECK (maintenance_type IN (
        'oil_check', 'oil_change', 'coolant_check', 'coolant_change', 'revision'
    )),
    date_performed DATE NOT NULL DEFAULT CURRENT_DATE,
    km_at_maintenance INTEGER NOT NULL,
    notes TEXT,
    performed_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_maintenance_history_car_id ON maintenance_history(car_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_history_type ON maintenance_history(maintenance_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_history_date ON maintenance_history(date_performed);

-- Habilitar RLS
ALTER TABLE maintenance_history ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Enable read access for all users" ON maintenance_history
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON maintenance_history
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON maintenance_history
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON maintenance_history
    FOR DELETE USING (auth.role() = 'authenticated');

-- Conceder permissões
GRANT ALL PRIVILEGES ON maintenance_history TO authenticated;
GRANT SELECT ON maintenance_history TO anon;

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_maintenance_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_maintenance_history_updated_at_trigger
    BEFORE UPDATE ON maintenance_history
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_history_updated_at();

-- Função para obter última manutenção de um tipo específico
CREATE OR REPLACE FUNCTION get_last_maintenance(
    p_car_id UUID,
    p_maintenance_type VARCHAR(50)
)
RETURNS TABLE (
    date_performed DATE,
    km_at_maintenance INTEGER,
    days_since INTEGER,
    km_since INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mh.date_performed,
        mh.km_at_maintenance,
        (CURRENT_DATE - mh.date_performed)::INTEGER as days_since,
        (COALESCE(c.current_km, 0) - mh.km_at_maintenance) as km_since
    FROM maintenance_history mh
    JOIN cars c ON c.id = p_car_id
    WHERE mh.car_id = p_car_id 
    AND mh.maintenance_type = p_maintenance_type
    ORDER BY mh.date_performed DESC, mh.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissões para a função
GRANT EXECUTE ON FUNCTION get_last_maintenance(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_last_maintenance(UUID, VARCHAR) TO anon;