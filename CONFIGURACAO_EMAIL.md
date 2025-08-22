# Configuração do Sistema de E-mails com Resend.com

Este documento explica como configurar e usar **GRATUITAMENTE** o sistema de e-mails automáticos do Sistema de Reservas do Grupo Pluma.

## 📧 Visão Geral

O sistema utiliza o **Resend.com** para envio de e-mails automáticos, incluindo:

- ✅ **Confirmação de Reserva** - Enviado para condutor e acompanhantes
- 📊 **Lembrete de KM** - Enviado 3x/dia até informar quilometragem
- 🔧 **Alerta de Revisão** - Quando carro próximo de 10.000km
- ⚠️ **Alerta de Manutenção** - Notificação de indisponibilidade

## 🚀 Configuração Inicial

### 1. Criar Conta no Resend.com

1. Acesse [resend.com](https://resend.com)
2. Crie uma conta gratuita
3. Verifique seu e-mail
4. Acesse o dashboard

### 2. Configurar Domínio (Recomendado)

1. No dashboard do Resend, vá em **Domains**
2. Clique em **Add Domain**
3. Digite seu domínio (ex: `grupopluma.com.br`)
4. Configure os registros DNS conforme instruções
5. Aguarde verificação (pode levar até 24h)

### 3. Obter API Key

1. No dashboard, vá em **API Keys**
2. Clique em **Create API Key**
3. Nome: `Sistema Reservas Grupo Pluma`
4. Permissões: **Sending access**
5. Copie a chave gerada (começa com `re_`)

## ⚙️ Configuração no Projeto

### 1. Variáveis de Ambiente

Adicione as seguintes variáveis no arquivo `.env` do projeto:

```env
# Resend Configuration (GRATUITA)
RESEND_API_KEY=re_sua_chave_aqui
FROM_EMAIL=onboarding@resend.dev
ADMIN_EMAIL=admin@grupopluma.com.br

# Supabase (já configurado)
SUPABASE_URL=sua_url_supabase
SUPABASE_ANON_KEY=sua_chave_anon
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
```

### 2. Configuração no Supabase

No painel do Supabase, vá em **Settings > Environment Variables** e adicione:

- `RESEND_API_KEY`: Sua chave do Resend
- `ADMIN_EMAIL`: E-mail do administrador

### 3. Deploy das Edge Functions

Execute os comandos para fazer deploy das funções:

```bash
# Deploy da função de envio de e-mail
npx supabase functions deploy send-email

# Deploy da função de lembretes diários
npx supabase functions deploy send-daily-reminders

# Deploy da função de alertas de manutenção
npx supabase functions deploy send-maintenance-alerts
```

## 📋 Tipos de E-mail

### 1. Confirmação de Reserva

**Quando é enviado:**
- Automaticamente ao finalizar uma reserva
- Quando o condutor informa a quilometragem final

**Destinatários:**
- Condutor principal
- Todos os acompanhantes

**Conteúdo:**
- Detalhes da reserva (datas, destino, carro)
- Informações dos acompanhantes
- Lembretes importantes

### 2. Lembrete de KM

**Quando é enviado:**
- 3 vezes por dia (8h, 14h, 18h)
- Apenas para reservas com KM pendente
- Para de enviar quando KM é informado

**Destinatários:**
- Condutor principal da reserva

**Conteúdo:**
- Lista de reservas pendentes
- Dias em atraso
- Link para informar KM

### 3. Alerta de Revisão

**Quando é enviado:**
- **Urgente**: Revisão vencida (KM > 10.000)
- **Atenção**: Próximo da revisão (500 KM restantes)
- **Informativo**: Se aproximando (1.000 KM restantes)

**Destinatários:**
- Administrador do sistema

**Conteúdo:**
- Dados do veículo
- Quilometragem atual e próxima revisão
- Nível de urgência

### 4. Alerta de Manutenção

**Quando é enviado:**
- Quando veículo entra em manutenção
- Quando há reservas afetadas

**Destinatários:**
- Administrador do sistema
- Condutores com reservas afetadas

**Conteúdo:**
- Detalhes da manutenção
- Reservas afetadas
- Ações necessárias

## 🔄 Automação

### Lembretes Diários

Para automatizar os lembretes diários, configure um cron job ou webhook:

```bash
# Exemplo de cron job (executar 3x/dia)
0 8,14,18 * * * curl -X POST "https://sua-url-supabase.functions.supabase.co/send-daily-reminders"
```

### Alertas de Manutenção

Para alertas automáticos de manutenção:

```bash
# Exemplo de cron job (executar diariamente às 9h)
0 9 * * * curl -X POST "https://sua-url-supabase.functions.supabase.co/send-maintenance-alerts"
```

## 🧪 Teste do Sistema

### 1. Teste Manual

Para testar o envio de e-mails:

```javascript
// No console do navegador ou Postman
fetch('https://sua-url-supabase.functions.supabase.co/send-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sua-chave-anon'
  },
  body: JSON.stringify({
    to: 'seu-email@teste.com',
    subject: 'Teste do Sistema',
    html: '<h1>E-mail de teste funcionando!</h1>'
  })
});
```

### 2. Teste de Confirmação

1. Faça uma reserva no sistema
2. Informe a quilometragem final
3. Verifique se o e-mail foi recebido

### 3. Teste de Lembretes

1. Deixe uma reserva sem informar KM
2. Execute a função manualmente:
   ```bash
   curl -X POST "https://sua-url-supabase.functions.supabase.co/send-daily-reminders"
   ```
3. Verifique se o lembrete foi enviado

## 🔧 Troubleshooting

### Problemas Comuns

**E-mails não estão sendo enviados:**
1. Verifique se a API key está correta
2. Confirme se as variáveis de ambiente estão configuradas
3. Verifique os logs das Edge Functions

**E-mails indo para spam:**
1. Configure SPF, DKIM e DMARC no seu domínio
2. Use um domínio verificado no Resend
3. Evite palavras que ativam filtros de spam

**Erro de permissão:**
1. Verifique se as políticas RLS estão corretas
2. Confirme se as permissões das tabelas estão configuradas
3. Use a service role key nas Edge Functions

### Logs e Monitoramento

Para verificar logs das funções:

```bash
# Ver logs da função de e-mail
npx supabase functions logs send-email

# Ver logs dos lembretes
npx supabase functions logs send-daily-reminders

# Ver logs dos alertas
npx supabase functions logs send-maintenance-alerts
```

## 📊 Monitoramento

### Dashboard do Resend

1. Acesse o dashboard do Resend
2. Vá em **Logs** para ver e-mails enviados
3. Monitore taxa de entrega e bounces
4. Configure webhooks para notificações

### Métricas Importantes

- **Taxa de entrega**: Deve ser > 95%
- **Taxa de abertura**: Esperado 20-30%
- **Bounces**: Deve ser < 5%
- **Spam complaints**: Deve ser < 0.1%

## 🔒 Segurança

### Boas Práticas

1. **Nunca** exponha a API key no frontend
2. Use apenas nas Edge Functions (servidor)
3. Configure rate limiting se necessário
4. Monitore uso para detectar abusos
5. Rotacione a API key periodicamente

### Permissões

- Use **Sending access** apenas
- Não conceda permissões desnecessárias
- Monitore logs de acesso

## 📞 Suporte

### Contatos

- **Resend Support**: [help@resend.com](mailto:help@resend.com)
- **Documentação**: [resend.com/docs](https://resend.com/docs)
- **Status**: [status.resend.com](https://status.resend.com)

### Recursos Úteis

- [Guia de configuração de domínio](https://resend.com/docs/dashboard/domains/introduction)
- [Melhores práticas de entregabilidade](https://resend.com/docs/knowledge-base/deliverability-best-practices)
- [Exemplos de código](https://resend.com/docs/examples)

---

**Sistema de Reservas - Grupo Pluma**  
*Documentação atualizada em: Janeiro 2025*

## 💰 Configuração Gratuita

**Importante**: Este sistema foi configurado para usar o domínio gratuito do Resend (`onboarding@resend.dev`), eliminando a necessidade de:
- ❌ Comprar domínio próprio
- ❌ Configurar DNS
- ❌ Custos mensais

**Benefícios da configuração gratuita:**
- ✅ 100 e-mails/dia grátis
- ✅ 3.000 e-mails/mês grátis
- ✅ Funciona imediatamente
- ✅ Ideal para pequenas empresas