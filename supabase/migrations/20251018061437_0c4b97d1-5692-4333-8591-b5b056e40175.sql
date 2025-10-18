-- Corregir la función para incluir search_path
CREATE OR REPLACE FUNCTION get_table_names()
RETURNS TABLE(table_name text) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT tablename::text
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename;
END;
$$;