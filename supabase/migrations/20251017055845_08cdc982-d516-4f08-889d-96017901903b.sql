-- Habilitar RLS en la tabla Verdadera_Música (si no está habilitado ya)
ALTER TABLE public."Verdadera_Música" ENABLE ROW LEVEL SECURITY;

-- Crear política para permitir lectura pública de todos los registros
CREATE POLICY "Permitir lectura pública" 
ON public."Verdadera_Música" 
FOR SELECT 
USING (true);

-- Habilitar RLS en la tabla estudiantes
ALTER TABLE public.estudiantes ENABLE ROW LEVEL SECURITY;

-- Crear política para permitir lectura pública de estudiantes
CREATE POLICY "Permitir lectura pública de estudiantes" 
ON public.estudiantes 
FOR SELECT 
USING (true);