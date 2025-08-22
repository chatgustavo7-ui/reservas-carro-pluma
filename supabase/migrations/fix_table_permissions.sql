-- Verificar permissões atuais
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name IN ('cars', 'conductors') 
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- Conceder permissões para a tabela cars
GRANT SELECT ON cars TO anon;
GRANT ALL PRIVILEGES ON cars TO authenticated;

-- Conceder permissões para a tabela conductors
GRANT SELECT ON conductors TO anon;
GRANT ALL PRIVILEGES ON conductors TO authenticated;

-- Verificar permissões após a correção
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name IN ('cars', 'conductors') 
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;