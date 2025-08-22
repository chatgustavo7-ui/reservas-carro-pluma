const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://mnvasniimrvvvlbzvtmn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1udmFzbmlpbXJ2dnZsYnp2dG1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3OTg3MTIsImV4cCI6MjA3MTM3NDcxMn0.a2czjdPTmvR5JROq8-jDKoHYyMKgKZ1K-CNcuqiTHgc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConductors() {
  try {
    console.log('Testando busca de condutores...');
    
    const { data, error } = await supabase
      .from('conductors')
      .select('*')
      .eq('active', true)
      .order('name');
    
    if (error) {
      console.error('Erro ao buscar condutores:', error);
      return;
    }
    
    console.log('Condutores encontrados:', data?.length || 0);
    console.log('Dados dos condutores:');
    data?.forEach((conductor, index) => {
      console.log(`${index + 1}. ${conductor.name} - ${conductor.email}`);
    });
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

testConductors();