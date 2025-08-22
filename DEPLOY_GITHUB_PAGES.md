# Deploy Gratuito no GitHub Pages - Grupo Pluma

## Configuração para Hospedagem Gratuita

Este guia explica como fazer o deploy do Sistema de Reservas do Grupo Pluma no GitHub Pages de forma completamente gratuita.

## 📋 Pré-requisitos

- Conta no GitHub (gratuita)
- Repositório público no GitHub
- Projeto configurado com Vite

## 🚀 Configuração do Deploy

### 1. Configurar Base URL no Vite

Edite o arquivo `vite.config.ts` para incluir a base URL do GitHub Pages:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/reservas-carro-pluma/', // Nome do seu repositório
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### 2. Criar Workflow do GitHub Actions

Crie o arquivo `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v3
      
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build
      run: npm run build
      
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      if: github.ref == 'refs/heads/main'
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

### 3. Configurar GitHub Pages

1. Vá para o repositório no GitHub
2. Acesse **Settings** > **Pages**
3. Em **Source**, selecione **GitHub Actions**
4. O deploy será automático a cada push na branch `main`

## 🔧 Configurações Específicas

### Variáveis de Ambiente

Para o GitHub Pages, configure as variáveis de ambiente no repositório:

1. Vá em **Settings** > **Secrets and variables** > **Actions**
2. Adicione as seguintes variáveis:

```
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
VITE_RESEND_API_KEY=sua_chave_do_resend
```

### Configuração do Supabase para GitHub Pages

No painel do Supabase, adicione a URL do GitHub Pages nas configurações:

1. **Authentication** > **URL Configuration**
2. **Site URL**: `https://seuusuario.github.io/reservas-carro-pluma`
3. **Redirect URLs**: Adicione a mesma URL

## 📧 Configuração de E-mail Gratuita

### Resend.com (Gratuito)

- **100 e-mails/dia** gratuitamente
- Use o domínio: `onboarding@resend.dev`
- Configuração já implementada no sistema

### Configuração no .env

```env
# Resend Configuration (Gratuito)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=onboarding@resend.dev
ADMIN_EMAIL=admin@grupopluma.com.br
```

## 🌐 URLs do Sistema

- **Produção**: `https://seuusuario.github.io/reservas-carro-pluma`
- **Desenvolvimento**: `http://localhost:5173`

## 📱 Funcionalidades Disponíveis

✅ **Totalmente Gratuito**:
- Hospedagem no GitHub Pages
- Banco de dados no Supabase (plano gratuito)
- E-mails via Resend (100/dia gratuitos)
- SSL automático
- CDN global

✅ **Funcionalidades Completas**:
- Sistema de reservas
- Gestão de veículos
- Notificações por e-mail
- Controle de quilometragem
- Alertas de manutenção
- Interface responsiva

## 🔄 Processo de Deploy

1. **Desenvolvimento Local**:
   ```bash
   npm run dev
   ```

2. **Build de Produção**:
   ```bash
   npm run build
   ```

3. **Deploy Automático**:
   - Push para a branch `main`
   - GitHub Actions executa o build
   - Deploy automático no GitHub Pages

## 🛠️ Troubleshooting

### Problema: Página em branco
- Verifique se a `base` no `vite.config.ts` está correta
- Confirme se as variáveis de ambiente estão configuradas

### Problema: E-mails não enviados
- Verifique a configuração do Resend
- Confirme se a API key está correta
- Verifique os logs no painel do Supabase

### Problema: Erro de CORS
- Configure as URLs corretas no Supabase
- Adicione o domínio do GitHub Pages nas configurações

## 📞 Suporte

- **GitHub Pages**: [Documentação oficial](https://pages.github.com/)
- **Supabase**: [Documentação](https://supabase.com/docs)
- **Resend**: [Documentação](https://resend.com/docs)

---

**Grupo Pluma** - Sistema de Reservas de Veículos  
*Deploy 100% gratuito e funcional* 🚀