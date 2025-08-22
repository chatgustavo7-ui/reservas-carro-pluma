-- Atualizar e-mails dos condutores conforme solicitado
-- Corrigindo os e-mails para os domínios corretos

UPDATE conductors SET email = 'paulo.henrique@belloalimentos.com.br' WHERE name = 'Paulo H.';
UPDATE conductors SET email = 'eduardo.sawasaki@belloalimentos.com.br' WHERE name = 'Eduardo S.';
UPDATE conductors SET email = 'maycon.azevedo@belloalimentos.com.br' WHERE name = 'Maycon A.';
UPDATE conductors SET email = 'guilherme.tamanho@belloalimentos.com.br' WHERE name = 'Guilherme T.';
UPDATE conductors SET email = 'rejeane.mezzalira@belloalimentos.com.br' WHERE name = 'Rejeane M.';
UPDATE conductors SET email = 'aryanne.andrade@belloalimentos.com.br' WHERE name = 'Ayeska A.';
UPDATE conductors SET email = 'francisco.santos@belloalimentos.com.br' WHERE name = 'Francisco S.';
UPDATE conductors SET email = 'joao.marcos@belloalimentos.com.br' WHERE name = 'Joao C.';
UPDATE conductors SET email = 'martielo.oliveira@belloalimentos.com.br' WHERE name = 'Martielo O.';
UPDATE conductors SET email = 'gustavo.camargo@plumaagro.com.br' WHERE name = 'Gustavo C.';

-- Verificar as atualizações
SELECT name, email FROM conductors ORDER BY name;