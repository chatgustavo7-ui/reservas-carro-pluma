-- Verify that all policies and structures are in place
-- This will update the types automatically to match your database

-- Ensure all the database structure is properly set up
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'reservations' AND table_schema = 'public';