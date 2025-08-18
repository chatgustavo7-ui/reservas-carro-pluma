import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail } from 'lucide-react';

export const EmailTest = () => {
  const [email, setEmail] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  const testEmail = async () => {
    if (!email) {
      toast({
        title: 'Email necessário',
        description: 'Por favor, informe um email para testar.',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);
    try {
      console.log('Testing email to:', email);
      
      const { data, error } = await supabase.functions.invoke('test-email', {
        body: { to: email }
      });

      if (error) {
        console.error('Error calling test-email function:', error);
        throw error;
      }

      console.log('Test email response:', data);

      toast({
        title: 'Email de teste enviado!',
        description: `Email de teste enviado para ${email}. Verifique sua caixa de entrada.`,
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      toast({
        title: 'Erro no teste',
        description: 'Erro ao enviar email de teste. Verifique os logs do console.',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Teste de Email
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button 
          onClick={testEmail} 
          disabled={isTesting || !email}
          className="w-full"
        >
          {isTesting ? 'Enviando...' : 'Enviar Email de Teste'}
        </Button>
      </CardContent>
    </Card>
  );
};