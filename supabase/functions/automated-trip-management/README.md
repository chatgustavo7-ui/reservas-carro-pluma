# Sistema de Automação de Viagens

Este sistema automatiza o gerenciamento de viagens não finalizadas, enviando lembretes por e-mail e finalizando viagens automaticamente.

## Funcionalidades

### 1. Lembretes Automáticos por E-mail
- **Frequência**: 3x por dia (8h, 14h, 20h - horário de Brasília)
- **Destinatário**: Condutor responsável pela reserva
- **Conteúdo**: Lembrete para informar quilometragem final
- **Níveis de urgência**:
  - 🔵 **ATENÇÃO** (1-2 dias de atraso)
  - 🟡 **URGENTE** (3-6 dias de atraso)
  - 🔴 **CRÍTICO** (7+ dias de atraso)

### 2. Finalização Automática
- **Horário**: 18h (horário de Brasília)
- **Ação**: Finaliza automaticamente viagens que deveriam ter sido devolvidas no dia
- **Status**: Altera para 'concluída'
- **Log**: Registra a ação automática

### 3. Sistema de Logs
- Registra todos os e-mails enviados
- Registra finalizações automáticas
- Controla frequência de envio (evita spam)
- Histórico completo de ações

## Configuração

### 1. Aplicar Migração do Banco

```bash
# Aplicar a migração que cria as funções e tabelas necessárias
supabase db push
```

Ou execute manualmente o arquivo `20241222_automation_system.sql` no SQL Editor do Supabase.

### 2. Configurar Variáveis de Ambiente

No painel do Supabase, configure as seguintes variáveis:

```env
RESEND_API_KEY=re_xxxxxxxxxx
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Configurar Scheduler (Cron Jobs)

#### Opção A: Supabase Cron (Recomendado)

1. Execute o arquivo `cron.sql` no SQL Editor do Supabase
2. Atualize a URL da função com seu project-ref:
   ```sql
   -- Substitua 'your-project-ref' pelo seu project-ref real
   url := 'https://your-project-ref.supabase.co/functions/v1/automated-trip-management'
   ```

#### Opção B: Serviço Externo (GitHub Actions, Vercel Cron, etc.)

Configure para chamar a Edge Function nos horários:
- 8h, 14h, 20h (lembretes)
- 18h (finalização automática)

```bash
# Exemplo de chamada
curl -X POST 'https://your-project.supabase.co/functions/v1/automated-trip-management' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json'
```

### 4. Configurar Resend (E-mail)

1. Crie uma conta no [Resend.com](https://resend.com)
2. Obtenha sua API Key
3. Configure o domínio de envio
4. Adicione a API Key nas variáveis de ambiente

## Estrutura do Sistema

### Funções Supabase

- `get_overdue_reservations()`: Busca reservas em atraso
- `auto_complete_overdue_reservations()`: Finaliza viagens automaticamente
- `log_email_sent()`: Registra envio de e-mail
- `should_send_email()`: Controla frequência de envio

### Edge Function

- **Arquivo**: `index.ts`
- **Endpoint**: `/functions/v1/automated-trip-management`
- **Método**: POST
- **Autenticação**: Service Role Key

### Templates de E-mail

- **Arquivo**: Integrado na Edge Function
- **Responsivo**: Sim
- **Níveis de urgência**: 3 (atenção, urgente, crítico)
- **Personalização**: Nome, veículo, dias de atraso, etc.

## Monitoramento

### Logs da Edge Function

```bash
# Visualizar logs em tempo real
supabase functions logs automated-trip-management --follow
```

### Verificar Jobs do Cron

```sql
-- Ver jobs ativos
SELECT jobname, schedule, active, jobid
FROM cron.job 
WHERE jobname LIKE 'automated-trip-%'
ORDER BY jobname;

-- Ver histórico de execução
SELECT * FROM cron.job_run_details 
WHERE jobid IN (
  SELECT jobid FROM cron.job 
  WHERE jobname LIKE 'automated-trip-%'
)
ORDER BY start_time DESC
LIMIT 20;
```

### Verificar Logs de Automação

```sql
-- Ver últimos e-mails enviados
SELECT 
  al.*,
  r.id as reservation_id,
  c.name as conductor_name
FROM automation_logs al
JOIN reservations r ON al.reservation_id = r.id
JOIN conductors c ON r.conductor_id = c.id
WHERE al.action_type = 'email_sent'
ORDER BY al.created_at DESC
LIMIT 10;

-- Ver finalizações automáticas
SELECT *
FROM automation_logs
WHERE action_type = 'auto_completion'
ORDER BY created_at DESC
LIMIT 10;
```

## Troubleshooting

### E-mails não estão sendo enviados

1. Verifique a API Key do Resend
2. Verifique se o domínio está configurado
3. Verifique os logs da Edge Function
4. Verifique se os jobs do cron estão ativos

### Finalização automática não funciona

1. Verifique se a função `auto_complete_overdue_reservations` existe
2. Verifique os horários do cron (UTC vs Brasília)
3. Verifique as permissões do service role

### Jobs do cron não executam

1. Verifique se a extensão `pg_cron` está habilitada
2. Verifique se a URL da função está correta
3. Verifique se o service role key está configurado
4. Verifique os logs do cron

## Personalização

### Alterar Horários

Edite o arquivo `cron.sql` e ajuste os horários:

```sql
-- Exemplo: alterar para 9h, 15h, 21h
'0 12 * * *', -- 9h Brasília = 12h UTC
'0 18 * * *', -- 15h Brasília = 18h UTC
'0 0 * * *',  -- 21h Brasília = 0h UTC (dia seguinte)
```

### Alterar Template de E-mail

Edite a função `getOverdueTripReminderTemplate` no arquivo `index.ts`.

### Alterar Critérios de Urgência

Edite as condições na Edge Function:

```typescript
// Atual: crítico >= 7 dias, urgente >= 3 dias
const urgencyLevel = data.daysOverdue >= 7 ? 'critical' : 
                    data.daysOverdue >= 3 ? 'urgent' : 'warning';
```

## Segurança

- ✅ Service Role Key protegida
- ✅ CORS configurado
- ✅ Validação de dados
- ✅ Rate limiting por e-mail
- ✅ Logs de auditoria

## Performance

- ✅ Índices otimizados
- ✅ Consultas eficientes
- ✅ Processamento em lote
- ✅ Controle de frequência

## Suporte

Para dúvidas ou problemas:

1. Verifique os logs da Edge Function
2. Verifique a documentação do Supabase
3. Verifique a documentação do Resend
4. Entre em contato com o suporte técnico