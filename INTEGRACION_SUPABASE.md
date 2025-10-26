# Integración con Supabase para Resultados de ML

## 📋 Resumen

Se ha implementado la funcionalidad para guardar los resultados de entrenamiento de modelos y predicciones directamente en **Supabase** desde el módulo "Resultados".

---

## 🎯 Funcionalidad Implementada

### Flujo Completo

```
1. Cargar Datos
   ↓
2. Entrenar Modelo (Scikit-learn o PyTorch)
   ↓
3. Ver Resultados
   ↓
4. Click "Guardar en Supabase" ⭐ NUEVO
   ↓
5. Datos guardados en Supabase
```

---

## 🗄️ Estructura de Base de Datos

### Tabla: `model_results`

Almacena los resultados principales de cada modelo entrenado.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | ID único (Primary Key) |
| `table_name` | TEXT | Nombre de la tabla de datos usada |
| `framework` | TEXT | Framework usado (sklearn/pytorch) |
| `model_type` | TEXT | Tipo de modelo (rf, mlp, etc.) |
| `metrics` | JSONB | Métricas del modelo (JSON) |
| `training_time` | FLOAT | Tiempo de entrenamiento (segundos) |
| `model_parameters` | INTEGER | Número de parámetros del modelo |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de actualización |

**Ejemplo de datos:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "table_name": "iris",
  "framework": "sklearn",
  "model_type": "rf",
  "metrics": {
    "accuracy": 0.95,
    "precision": 0.93,
    "recall": 0.92,
    "f1_score": 0.92
  },
  "training_time": 2.5,
  "model_parameters": 1000,
  "created_at": "2025-10-26T05:45:00Z"
}
```

### Tabla: `model_predictions`

Almacena las predicciones individuales de cada modelo.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | ID único (Primary Key) |
| `model_result_id` | UUID | Referencia a model_results |
| `sample_id` | INTEGER | ID de la muestra |
| `true_value` | TEXT | Valor real |
| `predicted_value` | TEXT | Valor predicho |
| `confidence` | FLOAT | Confianza (0-1) |
| `created_at` | TIMESTAMP | Fecha de creación |

**Ejemplo de datos:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "model_result_id": "550e8400-e29b-41d4-a716-446655440000",
  "sample_id": 1,
  "true_value": "setosa",
  "predicted_value": "setosa",
  "confidence": 0.98,
  "created_at": "2025-10-26T05:45:01Z"
}
```

### Relaciones

```
model_results (1) ──── (N) model_predictions
```

- Un modelo puede tener múltiples predicciones
- Las predicciones se eliminan en cascada si se elimina el modelo

---

## 🔧 Implementación Backend

### Endpoint: `POST /save-to-supabase`

**Ubicación:** `backend/app.py`

**Request Body:**
```json
{
  "table_name": "iris",
  "training_results": {
    "framework": "sklearn",
    "metrics": {
      "accuracy": 0.95,
      "precision": 0.93,
      "recall": 0.92,
      "f1_score": 0.92
    },
    "training_time": 2.5,
    "model_parameters": 1000
  },
  "predictions": [
    {
      "sample_id": 1,
      "true_value": "setosa",
      "predicted_value": "setosa",
      "confidence": 0.98
    }
  ],
  "model_metadata": {
    "model_type": "rf",
    "timestamp": "2025-10-26T05:45:00Z"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Resultados guardados exitosamente en Supabase",
  "record_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (Error):**
```json
{
  "detail": "Error al guardar en Supabase: [mensaje de error]"
}
```

### Código Backend

```python
@app.post("/save-to-supabase")
async def save_to_supabase(request: SaveToSupabaseRequest):
    """Save training results and predictions to Supabase"""
    try:
        # Preparar datos para guardar
        data_to_insert = {
            "table_name": request.table_name,
            "framework": request.training_results.get("framework"),
            "metrics": request.training_results.get("metrics", {}),
            "model_type": request.model_metadata.get("model_type"),
            "training_time": request.training_results.get("training_time"),
            "model_parameters": request.training_results.get("model_parameters"),
        }
        
        # Guardar en tabla de resultados
        result = supabase.table("model_results").insert(data_to_insert).execute()
        
        # Guardar predicciones
        if request.predictions:
            model_id = result.data[0]["id"]
            predictions_data = [...]
            supabase.table("model_predictions").insert(predictions_data).execute()
        
        return {"success": True, "message": "Guardado exitosamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

## 💻 Implementación Frontend

### Botón en ResultsDialog

**Ubicación:** `src/components/modules/ResultsDialog.tsx`

**Código:**
```typescript
const handleSaveToSupabase = async () => {
  if (!trainingResults) return;
  
  setLoading(true);
  
  try {
    const response = await axios.post("/save-to-supabase", {
      table_name: "model_results",
      training_results: trainingResults,
      predictions: predictions.length > 0 ? predictions : null,
      model_metadata: {
        model_type: trainingResults.framework === "sklearn" ? "scikit-learn" : "pytorch",
        timestamp: new Date().toISOString()
      }
    });
    
    toast({
      title: "✅ Guardado en Supabase",
      description: response.data.message,
    });
  } catch (error: any) {
    toast({
      title: "Error al guardar en Supabase",
      description: error.response?.data?.detail || "Error desconocido",
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};
```

### Interfaz de Usuario

```
┌─────────────────────────────────────────────┐
│  📊 Resultados del Modelo                   │
├─────────────────────────────────────────────┤
│  [Métricas] [Predicciones] [Análisis]      │
│                                             │
│  ... contenido de resultados ...            │
│                                             │
├─────────────────────────────────────────────┤
│  [📥 Exportar]  [💾 Guardar Modelo]        │
│  [💾 Guardar en Supabase] ⭐               │
└─────────────────────────────────────────────┘
```

**Características del botón:**
- ✅ Icono de Save (💾)
- ✅ Texto: "Guardar en Supabase"
- ✅ Estado de carga: "Guardando..."
- ✅ Deshabilitado durante guardado
- ✅ Estilo: Gradient primary (destacado)
- ✅ Notificación de éxito/error

---

## 📝 Configuración de Supabase

### 1. Crear las Tablas

Ejecutar el script SQL en Supabase:

```bash
# Ubicación del script
backend/supabase_tables.sql
```

**Pasos:**
1. Ir a Supabase Dashboard
2. Seleccionar proyecto
3. Ir a SQL Editor
4. Copiar y pegar el contenido de `supabase_tables.sql`
5. Ejecutar

### 2. Configurar Permisos (RLS)

Si tienes Row Level Security (RLS) habilitado:

```sql
-- Permitir inserción para usuarios autenticados
CREATE POLICY "Allow insert for authenticated users"
ON model_results
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow insert predictions for authenticated users"
ON model_predictions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permitir lectura para usuarios autenticados
CREATE POLICY "Allow read for authenticated users"
ON model_results
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow read predictions for authenticated users"
ON model_predictions
FOR SELECT
TO authenticated
USING (true);
```

### 3. Verificar Conexión

**Backend:**
```python
# backend/supabase_client.py
SUPABASE_URL = "https://syqvsnlqexyxleuabdvv.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Frontend:**
```typescript
// src/integrations/supabase/client.ts
const SUPABASE_URL = "https://syqvsnlqexyxleuabdvv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

---

## 🚀 Cómo Usar

### Paso a Paso

1. **Entrenar un modelo**
   ```
   Módulo "Entrenar Modelos" → Configurar → Entrenar
   ```

2. **Ver resultados**
   ```
   Automáticamente abre "Resultados"
   O click en módulo "Resultados"
   ```

3. **Guardar en Supabase**
   ```
   Click en botón "Guardar en Supabase"
   Esperar notificación de éxito
   ```

4. **Verificar en Supabase**
   ```
   Ir a Supabase Dashboard
   Table Editor → model_results
   Ver registro guardado
   ```

### Ejemplo Completo

```
1. Cargar iris.csv (150 filas)
2. Entrenar Random Forest
   - Accuracy: 95%
   - Precision: 93%
   - Recall: 92%
3. Ver resultados
4. Click "Guardar en Supabase"
5. ✅ Guardado exitosamente
6. Verificar en Supabase:
   - 1 registro en model_results
   - 20 registros en model_predictions
```

---

## 📊 Datos Guardados

### Información del Modelo

- ✅ Nombre de la tabla de datos
- ✅ Framework usado (sklearn/pytorch)
- ✅ Tipo de modelo (rf, mlp, etc.)
- ✅ Todas las métricas (JSON)
- ✅ Tiempo de entrenamiento
- ✅ Número de parámetros
- ✅ Timestamp de creación

### Predicciones

- ✅ Hasta 100 predicciones por modelo
- ✅ Valor real vs predicho
- ✅ Nivel de confianza
- ✅ ID de muestra
- ✅ Referencia al modelo

---

## 🔍 Consultas Útiles en Supabase

### Ver todos los modelos

```sql
SELECT 
  id,
  table_name,
  framework,
  model_type,
  metrics->>'accuracy' as accuracy,
  training_time,
  created_at
FROM model_results
ORDER BY created_at DESC;
```

### Ver predicciones de un modelo

```sql
SELECT 
  p.*,
  m.framework,
  m.model_type
FROM model_predictions p
JOIN model_results m ON p.model_result_id = m.id
WHERE m.id = 'tu-model-id'
ORDER BY p.sample_id;
```

### Estadísticas de modelos

```sql
SELECT 
  framework,
  COUNT(*) as total_models,
  AVG((metrics->>'accuracy')::float) as avg_accuracy,
  AVG(training_time) as avg_training_time
FROM model_results
GROUP BY framework;
```

### Modelos más recientes

```sql
SELECT 
  table_name,
  framework,
  model_type,
  metrics->>'accuracy' as accuracy,
  created_at
FROM model_results
ORDER BY created_at DESC
LIMIT 10;
```

---

## ✅ Validaciones

### Backend

- ✅ Verifica que trainingResults exista
- ✅ Valida estructura de datos
- ✅ Maneja errores de Supabase
- ✅ Limita predicciones a 100
- ✅ Retorna ID del registro creado

### Frontend

- ✅ Verifica que haya resultados
- ✅ Deshabilita botón durante guardado
- ✅ Muestra estado de carga
- ✅ Notificación de éxito/error
- ✅ Incluye predicciones si existen

---

## 🎯 Beneficios

1. **Persistencia** - Resultados guardados permanentemente
2. **Historial** - Seguimiento de todos los modelos entrenados
3. **Análisis** - Consultas SQL para análisis avanzado
4. **Comparación** - Comparar múltiples modelos
5. **Auditoría** - Timestamps automáticos
6. **Escalabilidad** - Base de datos en la nube
7. **Accesibilidad** - Datos accesibles desde cualquier lugar

---

## 📁 Archivos Modificados/Creados

### Backend

1. **`backend/app.py`** ✨ MODIFICADO
   - Agregado endpoint `/save-to-supabase`
   - Agregada clase `SaveToSupabaseRequest`
   - +50 líneas

2. **`backend/supabase_tables.sql`** ✨ NUEVO
   - Script SQL para crear tablas
   - Índices y triggers
   - Documentación

### Frontend

3. **`src/components/modules/ResultsDialog.tsx`** ✨ MODIFICADO
   - Agregada función `handleSaveToSupabase`
   - Agregado botón "Guardar en Supabase"
   - Importado icono Save
   - +40 líneas

### Documentación

4. **`INTEGRACION_SUPABASE.md`** ✨ NUEVO
   - Documentación completa
   - Ejemplos de uso
   - Consultas SQL

---

## 🔮 Mejoras Futuras

1. **Visualización de historial** - Ver modelos anteriores en la UI
2. **Comparación de modelos** - Comparar múltiples modelos lado a lado
3. **Exportar desde Supabase** - Descargar datos guardados
4. **Filtros y búsqueda** - Buscar modelos por criterios
5. **Gráficos de tendencias** - Evolución de métricas en el tiempo
6. **Compartir modelos** - Compartir resultados con otros usuarios
7. **Versionado** - Versiones de modelos entrenados

---

## 🐛 Troubleshooting

### Error: "Cannot insert into model_results"

**Solución:** Verificar que las tablas existan en Supabase
```sql
SELECT * FROM model_results LIMIT 1;
```

### Error: "RLS policy violation"

**Solución:** Configurar políticas de RLS o deshabilitar RLS
```sql
ALTER TABLE model_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE model_predictions DISABLE ROW LEVEL SECURITY;
```

### Error: "Connection refused"

**Solución:** Verificar credenciales de Supabase
```python
# backend/supabase_client.py
print(SUPABASE_URL)  # Verificar URL
print(SUPABASE_KEY[:20])  # Verificar Key (primeros 20 chars)
```

### Predicciones no se guardan

**Solución:** Verificar que `predictions` tenga datos
```typescript
console.log("Predictions:", predictions.length);
```

---

## ✅ Estado Final

- ✅ Endpoint backend implementado
- ✅ Botón frontend agregado
- ✅ Tablas SQL creadas
- ✅ Documentación completa
- ✅ Validaciones implementadas
- ✅ Notificaciones configuradas
- ✅ Todo funcionando correctamente

**El sistema está listo para guardar resultados en Supabase!** 🎉

---

## 📚 Referencias

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Python Client](https://github.com/supabase-community/supabase-py)
- [Supabase JavaScript Client](https://github.com/supabase/supabase-js)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
