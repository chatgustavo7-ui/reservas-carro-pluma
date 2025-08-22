// Teste simples para verificar se as tabelas existem
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testTables() {
  console.log('Testando tabelas...');
  
  try {
    // Testar tabela cars
    const { data: cars, error: carsError } = await supabase
      .from('cars')
      .select('*')
      .limit(5);
    
    console.log('Cars:', cars);
    if (carsError) console.error('Cars error:', carsError);
    
    // Testar tabela conductors
    const { data: conductors, error: conductorsError } = await supabase
      .from('conductors')
      .select('*')
      .limit(5);
    
    console.log('Conductors:', conductors);
    if (conductorsError) console.error('Conductors error:', conductorsError);
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

testTables();