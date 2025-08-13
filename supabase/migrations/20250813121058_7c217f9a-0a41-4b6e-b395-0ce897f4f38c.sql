-- Adicionar política RLS para permitir UPDATE das reservas
CREATE POLICY "Anyone can update reservations" 
ON public.reservations 
FOR UPDATE 
USING (true) 
WITH CHECK (true);