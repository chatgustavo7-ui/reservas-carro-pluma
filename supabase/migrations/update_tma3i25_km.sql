-- Verificar dados atuais do carro TMA3I25
SELECT 
  plate,
  current_km,
  last_revision_km,
  next_revision_km,
  next_maintenance_km,
  status
FROM cars 
WHERE plate = 'TMA3I25';

-- Atualizar quilometragem do TMA3I25 para 6395 km
UPDATE cars 
SET 
  current_km = 6395,
  next_revision_km = 10000,
  next_maintenance_km = 10000,
  updated_at = NOW()
WHERE plate = 'TMA3I25';

-- Verificar se a atualização foi aplicada
SELECT 
  plate,
  current_km,
  last_revision_km,
  next_revision_km,
  next_maintenance_km,
  status,
  (next_revision_km - current_km) as km_until_revision
FROM cars 
WHERE plate = 'TMA3I25';

-- Comentário: O carro TMA3I25 agora tem 6.395 km
-- Próxima revisão aos 10.000 km (faltam 3.605 km)