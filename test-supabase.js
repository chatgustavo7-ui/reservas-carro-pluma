import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://mnvasniimrvvvlbzvtmn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1udmFzbmlpbXJ2dnZsYnp2dG1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3OTg3MTIsImV4cCI6MjA3MTM3NDcxMn0.a2czjdPTmvR5JROq8-jDKoHYyMKgKZ1K-CNcuqiTHgc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('Testando conexão com Supabase...');
    
    // Testar busca de carros
    console.log('\n1. Testando busca de carros:');
    const { data: cars, error: carsError } = await supabase
      .from('cars')
      .select('*');
    
    if (carsError) {
      console.error('Erro ao buscar carros:', carsError);
    } else {
      console.log('Carros encontrados:', cars?.length || 0);
      console.log('Dados dos carros:', cars);
    }
    
    // Testar busca de condutores
    console.log('\n2. Testando busca de condutores:');
    const { data: conductors, error: conductorsError } = await supabase
      .from('conductors')
      .select('*')
      .eq('is_active', true);
    
    if (conductorsError) {
      console.error('Erro ao buscar condutores:', conductorsError);
    } else {
      console.log('Condutores encontrados:', conductors?.length || 0);
      console.log('Dados dos condutores:', conductors);
    }
    
    // Testar estrutura da tabela reservations
    console.log('\n3. Testando estrutura da tabela reservations:');
    const { data: reservations, error: reservationsError } = await supabase
      .from('reservations')
      .select('*')
      .limit(1);
    
    if (reservationsError) {
      console.error('Erro ao acessar reservations:', reservationsError);
    } else {
      console.log('Tabela reservations acessível:', reservations !== null);
    }
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

testConnection();