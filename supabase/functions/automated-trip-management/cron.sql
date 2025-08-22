-- Configuração do Supabase Cron para automação de viagens
-- Este arquivo configura a execução automática da Edge Function 3x por dia

-- Criar extensão pg_cron se não existir
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remover jobs existentes se houver
SELECT cron.unschedule('automated-trip-management-morning');
SELECT cron.unschedule('automated-trip-management-afternoon');
SELECT cron.unschedule('automated-trip-management-evening');
SELECT cron.unschedule('automated-trip-finalization');

-- Job 1: Lembretes da manhã (8h - horário de Brasília = 11h UTC)
SELECT cron.schedule(
  'automated-trip-management-morning',
  '0 11 * * *', -- 8h Brasília = 11h UTC
  $$
  SELECT
    net.http_post(
      url := 'https://your-project-ref.supabase.co/functions/v1/automated-trip-management',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'action', 'morning_reminders',
        'timestamp', now()
      )
    );
  $$
);

-- Job 2: Lembretes da tarde (14h - horário de Brasília = 17h UTC)
SELECT cron.schedule(
  'automated-trip-management-afternoon',
  '0 17 * * *', -- 14h Brasília = 17h UTC
  $$
  SELECT
    net.http_post(
      url := 'https://your-project-ref.supabase.co/functions/v1/automated-trip-management',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'action', 'afternoon_reminders',
        'timestamp', now()
      )
    );
  $$
);

-- Job 3: Lembretes da noite (20h - horário de Brasília = 23h UTC)
SELECT cron.schedule(
  'automated-trip-management-evening',
  '0 23 * * *', -- 20h Brasília = 23h UTC
  $$
  SELECT
    net.http_post(
      url := 'https://your-project-ref.supabase.co/functions/v1/automated-trip-management',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'action', 'evening_reminders',
        'timestamp', now()
      )
    );
  $$
);

-- Job 4: Finalização automática (18h - horário de Brasília = 21h UTC)
SELECT cron.schedule(
  'automated-trip-finalization',
  '0 21 * * *', -- 18h Brasília = 21h UTC
  $$
  SELECT
    net.http_post(
      url := 'https://your-project-ref.supabase.co/functions/v1/automated-trip-management',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'action', 'auto_finalization',
        'timestamp', now()
      )
    );
  $$
);

-- Verificar jobs criados
SELECT 
  jobname,
  schedule,
  active,
  jobid
FROM cron.job 
WHERE jobname LIKE 'automated-trip-%'
ORDER BY jobname;

-- Comentários sobre configuração:
-- 1. Os horários estão em UTC, ajustados para o fuso horário de Brasília (UTC-3)
-- 2. A URL da função deve ser atualizada com o project-ref correto
-- 3. O service_role_key deve ser configurado nas configurações do projeto
-- 4. Os jobs executam todos os dias da semana
-- 5. Cada job chama a mesma Edge Function, que internamente verifica o horário

-- Para aplicar esta configuração:
-- 1. Execute este SQL no SQL Editor do Supabase
-- 2. Atualize a URL com o project-ref correto
-- 3. Configure o service_role_key nas configurações do projeto
-- 4. Verifique se a extensão pg_cron está habilitada
-- 5. Monitore os logs da Edge Function para verificar execução