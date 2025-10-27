# Visualización de Modelos Guardados

## ✅ Nueva Funcionalidad

Ahora puedes **visualizar gráficamente** los resultados de modelos guardados en IndexedDB, sin necesidad de volver a entrenarlos.

## Características

### 1. **Lista de Modelos Guardados**

Vista principal que muestra todos los modelos entrenados:

```
┌─────────────────────────────────────────────────┐
│ Modelo 27/10/2025 14:30:45                      │ [🗑️]
│ Entrenado el 27/10/2025 14:30:45                │
├─────────────────────────────────────────────────┤
│ Framework: scikit-learn  │ Tipo: regression     │
│ Predicciones: 50         │ Error Promedio: 3.2% │
├─────────────────────────────────────────────────┤
│ Excelente: 42  │ Bueno: 6  │ Mejorable: 2       │
├─────────────────────────────────────────────────┤
│ [📊 Ver Gráficos y Detalles]                    │
└─────────────────────────────────────────────────┘
```

### 2. **Diálogo de Detalles con Gráficos**

Al hacer clic en "Ver Gráficos y Detalles", se abre un diálogo completo con 3 pestañas:

#### **Pestaña 1: Métricas** 📊

**Métricas Principales**:
- R² Score, RMSE, MAE (para regresión)
- Accuracy, Precision, Recall, F1-Score (para clasificación)

**Gráfico de Distribución de Errores**:
- Gráfico de barras mostrando el error % por predicción
- Primeras 10 predicciones visualizadas

**Estadísticas de Error**:
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Error Prom. │ Error % Prom│ Error Mín.  │ Error Máx.  │
│    234.56   │    3.2%     │    12.34    │   567.89    │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

#### **Pestaña 2: Predicciones** 📈

**Lista de Predicciones**:
```
Muestra #1  │ Real: 1,245,000,000 | Pred: 1,280,000,000 │ Error: 2.8%
Muestra #2  │ Real: 698,000,000   | Pred: 723,000,000   │ Error: 3.6%
...
```

**Gráfico de Líneas: Real vs Predicho**:
- Línea azul: Valores reales
- Línea verde: Valores predichos
- Visualización clara de la precisión

**Gráfico de Barras Comparativo**:
- Barras azules: Valores reales
- Barras verdes: Valores predichos
- Comparación lado a lado

#### **Pestaña 3: Información** ℹ️

**Detalles del Modelo**:
- Framework utilizado (Scikit-learn/PyTorch)
- Tipo de modelo (linear, rf, gb, etc.)
- Tipo de tarea (regresión/clasificación)
- Total de predicciones
- Tiempo de entrenamiento
- Número de parámetros

**Resumen de Rendimiento**:
- Total de predicciones
- Error promedio
- Framework usado
- Tipo de tarea

## Flujo de Uso

### 1. **Entrenar y Guardar un Modelo**

```
Entrenar Modelos → Configurar → Entrenar → Guardar Modelo
```

El modelo se guarda en IndexedDB con:
- Métricas de entrenamiento
- Todas las predicciones
- Configuración del modelo
- Fecha y hora

### 2. **Ver Modelos Guardados**

```
Menú Principal → Ver Modelos Guardados
```

Se muestra la lista de todos los modelos guardados.

### 3. **Visualizar Gráficos**

```
Lista de Modelos → [Ver Gráficos y Detalles]
```

Se abre el diálogo con todas las visualizaciones.

### 4. **Navegar entre Pestañas**

```
Métricas → Predicciones → Información
```

Explora diferentes aspectos del modelo guardado.

## Ventajas

### 1. **Sin Re-entrenamiento** ⚡
- No necesitas volver a entrenar el modelo
- Acceso instantáneo a resultados históricos
- Ahorro de tiempo y recursos

### 2. **Comparación de Modelos** 📊
- Compara diferentes configuraciones
- Identifica el mejor modelo
- Analiza evolución del rendimiento

### 3. **Análisis Detallado** 🔍
- Gráficos interactivos
- Métricas completas
- Predicciones individuales

### 4. **Historial Completo** 📚
- Todos los modelos entrenados
- Fecha y hora de entrenamiento
- Configuración utilizada

## Gráficos Disponibles

### 1. **Distribución de Errores** (Barras)
```
Error %
  ↑
  │     ▄▄
  │  ▄▄ ██ ▄▄
  │  ██ ██ ██ ▄▄
  │  ██ ██ ██ ██
  └─────────────→ Muestras
```

### 2. **Real vs Predicho** (Líneas)
```
Valor
  ↑
  │    ●─────●
  │   /       \
  │  ●         ●
  │ /           \
  │●             ●
  └─────────────→ Muestras
  ● Real  ● Predicho
```

### 3. **Comparación por Barras**
```
Valor
  ↑
  │  ██ ██  ██ ██
  │  ██ ██  ██ ██
  │  ██ ██  ██ ██
  └─────────────→ Muestras
  ██ Real  ██ Predicho
```

## Gestión de Modelos

### **Exportar Modelos** 💾
```
[Exportar] → Descarga JSON con todos los modelos
```

Archivo: `ml-predictions-{timestamp}.json`

### **Importar Modelos** 📥
```
[Importar] → Selecciona archivo JSON → Carga modelos
```

Útil para:
- Backup de modelos
- Compartir resultados
- Migrar entre dispositivos

### **Eliminar Modelo** 🗑️
```
[🗑️] → Confirmar → Modelo eliminado
```

Elimina el modelo y todas sus predicciones.

## Ejemplo de Uso

### Caso: Predicción de Ganancias de Películas

**1. Entrenar varios modelos**:
```
Modelo A: genero, inversion → Error: 15%
Modelo B: genero, pais, inversion → Error: 8%
Modelo C: genero, pais, inversion, duracion → Error: 3%
```

**2. Ver modelos guardados**:
```
Lista muestra los 3 modelos con sus errores
```

**3. Comparar gráficamente**:
```
Modelo A: Predicciones dispersas
Modelo B: Predicciones mejores
Modelo C: Predicciones muy precisas ✅
```

**4. Decisión**:
```
Usar Modelo C para producción (menor error)
```

## Datos Almacenados

Cada modelo guardado incluye:

```typescript
{
  id: 1,
  model_name: "Modelo 27/10/2025 14:30:45",
  framework: "scikit-learn",
  model_type: "linear",
  task_type: "regression",
  training_date: "2025-10-27T14:30:45.000Z",
  model_parameters: 1024,
  training_time: 2.5,
  metrics: {
    test_r2: 0.87,
    test_rmse: 234.56,
    test_mae: 123.45
  },
  predictions: [
    {
      sample_id: 1,
      true_value: 1280000000,
      predicted_value: 1245000000,
      error: 35000000,
      error_percentage: 2.73
    },
    // ... más predicciones
  ],
  total_predictions: 50,
  avg_error: 234.56,
  avg_error_percentage: 3.2
}
```

## Interfaz de Usuario

### **Botón en Menú Principal**
```
┌─────────────────────────────────────┐
│ [📊 Ver Modelos Guardados]          │
└─────────────────────────────────────┘
```

### **Lista de Modelos**
```
┌─────────────────────────────────────┐
│ [Exportar] [Importar]               │
├─────────────────────────────────────┤
│ Modelo 1 [Ver Gráficos] [🗑️]       │
│ Modelo 2 [Ver Gráficos] [🗑️]       │
│ Modelo 3 [Ver Gráficos] [🗑️]       │
└─────────────────────────────────────┘
```

### **Diálogo de Detalles**
```
┌─────────────────────────────────────┐
│ Modelo 27/10/2025 14:30:45          │
├─────────────────────────────────────┤
│ [Métricas] [Predicciones] [Info]    │
├─────────────────────────────────────┤
│                                     │
│  [Gráficos y visualizaciones]       │
│                                     │
└─────────────────────────────────────┘
```

## Beneficios

### Para Desarrollo
- ✅ Prueba diferentes configuraciones
- ✅ Compara resultados fácilmente
- ✅ Identifica mejores hiperparámetros

### Para Producción
- ✅ Historial de modelos
- ✅ Auditoría de rendimiento
- ✅ Backup de resultados

### Para Análisis
- ✅ Visualización clara
- ✅ Métricas detalladas
- ✅ Comparación gráfica

## Limitaciones

### Almacenamiento
- IndexedDB tiene límites de almacenamiento (~50MB típico)
- Modelos muy grandes pueden llenar el espacio
- Solución: Exportar y limpiar modelos antiguos

### Rendimiento
- Muchos modelos (>100) pueden ralentizar la carga
- Solución: Eliminar modelos antiguos o irrelevantes

## Conclusión

La visualización de modelos guardados permite:
- ✅ Acceso rápido a resultados históricos
- ✅ Comparación visual de modelos
- ✅ Análisis detallado sin re-entrenamiento
- ✅ Gestión completa del historial

**Resultado**: Mejor toma de decisiones y análisis más eficiente de modelos de ML.
