import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { withRetry } from '@/integrations/supabase/retryUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const useDrivers = () => {
  return useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const result = await withRetry.select(() => 
        supabase
          .from('drivers')
          .select('*')
          .order('name', { ascending: true })
      );
      
      if (result.error) throw result.error;
      return result.data;
    },
    retry: false
  });
};

const Drivers = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '' });
  
  const queryClient = useQueryClient();
  const { data: drivers, isLoading } = useDrivers();

  const saveDriverMutation = useMutation({
    mutationFn: async (driver: { name: string; email: string; id?: string }) => {
      if (driver.id) {
        // Editar
        const { data, error } = await supabase
          .from('drivers')
          .update({ name: driver.name, email: driver.email })
          .eq('id', driver.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Criar
        const { data, error } = await supabase
          .from('drivers')
          .insert({ name: driver.name, email: driver.email })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setIsDialogOpen(false);
      setEditingDriver(null);
      setFormData({ name: '', email: '' });
      toast({
        title: 'Sucesso',
        description: editingDriver ? 'Condutor atualizado com sucesso' : 'Condutor criado com sucesso',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar condutor',
        variant: 'destructive',
      });
    },
  });

  const deleteDriverMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast({
        title: 'Sucesso',
        description: 'Condutor removido com sucesso',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao remover condutor',
        variant: 'destructive',
      });
    },
  });

  const handleOpenDialog = (driver?: Driver) => {
    if (driver) {
      setEditingDriver(driver);
      setFormData({ name: driver.name, email: driver.email });
    } else {
      setEditingDriver(null);
      setFormData({ name: '', email: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome e email são obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    saveDriverMutation.mutate({
      ...formData,
      id: editingDriver?.id,
    });
  };

  const handleDelete = (id: string) => {
    deleteDriverMutation.mutate(id);
  };

  return (
    <main className="min-h-screen bg-background py-12">
      <section className="px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <Button asChild variant="outline">
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
              </Link>
            </Button>
          </div>

          <header className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Condutores</h1>
                <p className="text-muted-foreground">
                  Gerencie os condutores e seus emails para recebimento de confirmações e lembretes.
                </p>
              </div>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Condutor
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingDriver ? 'Editar Condutor' : 'Novo Condutor'}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nome</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Nome completo"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="email@empresa.com"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-6">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleSave}
                      disabled={saveDriverMutation.isPending}
                    >
                      {saveDriverMutation.isPending ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </header>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Condutores</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground">Carregando condutores...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Último Lembrete</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers && drivers.length > 0 ? (
                      drivers.map((driver) => (
                        <TableRow key={driver.id}>
                          <TableCell className="font-medium">{driver.name}</TableCell>
                          <TableCell>{driver.email}</TableCell>
                          <TableCell>
                            {driver.km_reminder_last_sent_on || 'Nunca'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenDialog(driver)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remover Condutor</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja remover {driver.name}? 
                                      Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDelete(driver.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Remover
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Nenhum condutor cadastrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
};

export default Drivers;