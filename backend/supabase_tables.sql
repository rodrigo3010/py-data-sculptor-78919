-- Tabla para almacenar resultados de modelos entrenados
CREATE TABLE IF NOT EXISTS model_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    framework TEXT NOT NULL,
    model_type TEXT,
    metrics JSONB,
    training_time FLOAT,
    model_parameters INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para almacenar predicciones individuales
CREATE TABLE IF NOT EXISTS model_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_result_id UUID REFERENCES model_results(id) ON DELETE CASCADE,
    sample_id INTEGER,
    true_value TEXT,
    predicted_value TEXT,
    confidence FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_model_results_framework ON model_results(framework);
CREATE INDEX IF NOT EXISTS idx_model_results_created_at ON model_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_predictions_model_id ON model_predictions(model_result_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_model_results_updated_at
    BEFORE UPDATE ON model_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE model_results IS 'Almacena los resultados de modelos de ML entrenados';
COMMENT ON TABLE model_predictions IS 'Almacena las predicciones individuales de cada modelo';
COMMENT ON COLUMN model_results.metrics IS 'Métricas del modelo en formato JSON (accuracy, precision, recall, etc.)';
COMMENT ON COLUMN model_results.framework IS 'Framework usado: sklearn o pytorch';
COMMENT ON COLUMN model_predictions.confidence IS 'Nivel de confianza de la predicción (0-1)';
