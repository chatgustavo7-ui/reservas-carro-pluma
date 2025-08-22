# Guia de Configuração do Resend.com

## 📧 Sistema de E-mails Automáticos - Grupo Pluma

Este guia explica como configurar o Resend.com **GRATUITAMENTE** para o sistema de e-mails automáticos do projeto de reservas de carros do Grupo Pluma.

## 🚀 Passo a Passo da Configuração

### 1. Criar Conta no Resend.com

1. Acesse [resend.com](https://resend.com)
2. Clique em "Sign Up" e crie sua conta
3. Confirme seu e-mail
4. Faça login na plataforma

### 2. Configurar Domínio (Recomendado)

**Para e-mails profissionais:**

1. No dashboard do Resend, vá em "Domains"
2. Clique em "Add Domain"
3. Digite seu domínio (ex: `grupopluma.com.br`)
4. Configure os registros DNS conforme instruções:
   - **SPF**: `v=spf1 include:_spf.resend.com ~all`
   - **DKIM**: Adicione o registro TXT fornecido
   - **DMARC**: `v=DMARC1; p=quarantine; rua=mailto:admin@seudominio.com`

**💰 CONFIGURAÇÃO GRATUITA (Recomendada):**
- Use o domínio padrão do Resend: `onboarding@resend.dev`
- ✅ Sem custos adicionais
- ✅ Funciona imediatamente
- ✅ Ideal para projetos pessoais/pequenas empresas

### 3. Obter API Key

1. No dashboard, vá em "API Keys"
2. Clique em "Create API Key"
3. Dê um nome (ex: "Sistema Reservas Carros")
4. Selecione as permissões:
   - ✅ **Send emails**
   - ✅ **Read emails** (opcional)
5. Copie a chave gerada (começa com `re_`)

### 4. Configurar Variáveis de Ambiente

**No arquivo `.env` do projeto:**

```env
# Configuração do Resend
RESEND_API_KEY=re_sua_chave_aqui

# Configuração de E-mails (GRATUITA)
FROM_EMAIL=onboarding@resend.dev
ADMIN_EMAIL=admin@grupopluma.com.br
```

**No Supabase (para Edge Functions):**

1. Acesse o dashboard do Supabase
2. Vá em "Settings" > "Environment Variables"
3. Adicione as variáveis:
   - `RESEND_API_KEY`: sua chave do Resend
   - `FROM_EMAIL`: e-mail remetente
   - `ADMIN_EMAIL`: e-mail do administrador

### 5. Testar Configuração

**Teste local (frontend):**

```javascript
// No console do navegador
fetch('/api/test-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'seu-email@teste.com',
    subject: 'Teste Resend',
    html: '<h1>E-mail de teste!</h1>'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

**Teste Edge Function:**

```bash
# No terminal
curl -X POST 'https://sua-url-supabase.functions.supabase.co/send-email' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer sua-chave-anon' \
  -d '{
    "to": "seu-email@teste.com",
    "subject": "Teste Edge Function",
    "html": "<h1>Funcionando!</h1>"
  }'
```

## 📋 Funcionalidades Implementadas

### 1. E-mail de Confirmação de Reserva
- **Quando**: Após criar uma reserva
- **Para**: Condutor + acompanhantes
- **Conteúdo**: Detalhes da reserva, carro, datas

### 2. Lembrete de Quilometragem
- **Quando**: 3x por dia até informar KM
- **Para**: Condutor da reserva
- **Conteúdo**: Urgência do atraso, link para informar KM

### 3. Alerta de Revisão
- **Quando**: Carro próximo de revisão
- **Para**: Administrador
- **Tipos**:
  - 🔴 **Urgente**: Revisão vencida
  - 🟡 **Atenção**: 500km restantes
  - 🔵 **Informativo**: 1000km restantes

### 4. Alerta de Manutenção
- **Quando**: Carro indisponível
- **Para**: Admin + condutores afetados
- **Conteúdo**: Motivo, previsão de retorno

## 🔧 Configurações Avançadas

### Webhooks (Opcional)

Para receber notificações de entrega:

1. No Resend, vá em "Webhooks"
2. Adicione endpoint: `https://sua-url.com/webhook/resend`
3. Selecione eventos: `email.sent`, `email.delivered`, `email.bounced`

### Rate Limits

**Plano Gratuito:**
- 100 e-mails/dia
- 3.000 e-mails/mês

**Plano Pago:**
- A partir de $20/mês
- 50.000 e-mails/mês

### Monitoramento

**Logs no Resend:**
- Dashboard > "Logs"
- Veja status de entrega, aberturas, cliques

**Logs no Supabase:**
- Functions > "Logs"
- Monitore execução das Edge Functions

## 🚨 Solução de Problemas

### Erro: "API key not found"
- ✅ Verifique se a chave está correta no `.env`
- ✅ Reinicie o servidor após alterar `.env`
- ✅ No Supabase, verifique as variáveis de ambiente

### Erro: "Domain not verified"
- ✅ Configure os registros DNS corretamente
- ✅ Aguarde propagação (até 24h)
- ✅ Use domínio padrão para testes

### E-mails não chegam
- ✅ Verifique spam/lixo eletrônico
- ✅ Confirme se o domínio está verificado
- ✅ Teste com diferentes provedores de e-mail

### Rate limit excedido
- ✅ Monitore uso no dashboard
- ✅ Considere upgrade do plano
- ✅ Implemente cache para evitar duplicatas

## 📞 Suporte

- **Documentação**: [resend.com/docs](https://resend.com/docs)
- **Discord**: [discord.gg/resend](https://discord.gg/resend)
- **E-mail**: support@resend.com

---

✅ **Sistema configurado e funcionando!**

Todos os templates de e-mail estão implementados e as Edge Functions configuradas. O sistema está pronto para enviar e-mails automáticos de confirmação, lembretes e alertas.