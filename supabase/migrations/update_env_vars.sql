-- Atualizar variáveis de ambiente do Supabase para Resend
-- Este arquivo contém instruções para configuração manual no painel do Supabase

-- INSTRUÇÕES PARA CONFIGURAÇÃO:
-- 1. Acesse o painel do Supabase: https://supabase.com/dashboard
-- 2. Selecione seu projeto
-- 3. Vá para Settings > Edge Functions
-- 4. Na seção "Environment Variables", adicione/atualize:

-- SENDGRID_API_KEY=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
-- FROM_EMAIL=plumareservas@gmail.com
-- REPLY_TO_EMAIL=plumareservas@gmail.com
-- ADMIN_EMAIL=plumareservas@gmail.com

-- NOTA IMPORTANTE:
-- As variáveis de ambiente das Edge Functions devem ser configuradas
-- manualmente no painel do Supabase, não através de SQL migrations.
-- Após configurar, faça o redeploy das Edge Functions se necessário.

-- Confirmação da configuração
SELECT 'Instruções de configuração criadas para Grupo Pluma - Reserva de Carro Pluma' as message;

-- Verificar se as funções estão funcionando corretamente
-- Teste enviando um e-mail após a configuração das variáveis