# Migración de ML al Frontend

## ✅ Cambios Realizados

Se ha migrado completamente la lógica de entrenamiento de modelos del backend Python al frontend JavaScript usando **TensorFlow.js** y **ml.js**.

## Librerías Instaladas

```bash
npm install @tensorflow/tfjs ml-regression ml-matrix
```

- **@tensorflow/tfjs**: Framework de ML para JavaScript (redes neuronales)
- **ml-regression**: Algoritmos de regresión (lineal, polinomial)
- **ml-matrix**: Operaciones matriciales

## Nuevo Servicio: `src/lib/ml-service.ts`

### Funcionalidades

1. **Preparación de datos**
   - ✅ **Columnas numéricas**: Conversión automática
   - ✅ **Columnas categóricas (strings)**: Label Encoding automático
   - ✅ División train/test
   - ✅ Normalización (StandardScaler)
   - ✅ Manejo de valores nulos

2. **Modelos soportados**
   - **Regresión Lineal Simple**: Para una característica (ml-regression)
   - **Regresión/Clasificación con Redes Neuronales**: Para múltiples características (TensorFlow.js)

3. **Métricas**
   - **Regresión**: MSE, RMSE, MAE, R²
   - **Clasificación**: Accuracy, Precision, Recall, F1-Score

4. **Predicciones**
   - Generación automática de predicciones con errores calculados
   - Formato compatible con el sistema existente

### Arquitectura de Red Neuronal Mejorada

```
Input Layer 
  ↓
Dense(max(64, features*8), relu) + Dropout(0.2)
  ↓
Dense(max(32, features*4), relu) + Dropout(0.2)
  ↓
Dense(max(16, features*2), relu)
  ↓
Output Layer
```

- **Regresión**: Output con activación lineal (1 neurona)
- **Clasificación**: Output con activación softmax (n clases)
- **Dropout**: Previene overfitting
- **He Normal**: Inicialización de pesos mejorada
- **Validación**: 10% de datos para validación durante entrenamiento

## Cambios en Componentes

### `ModelTrainerDialog.tsx`

**Antes**: Enviaba datos al backend Python
```typescript
const response = await axios.post("/train-model", requestBody);
```

**Ahora**: Entrena en el navegador
```typescript
const { trainModel } = await import('@/lib/ml-service');
const result = await trainModel(loadedData.rows, targetColumn, config);
```

**Ventajas**:
- ✅ No requiere backend Python
- ✅ Entrenamiento instantáneo en el navegador
- ✅ Sin latencia de red
- ✅ Funciona offline

### `ResultsDialog.tsx`

**Antes**: Obtenía predicciones del backend
```typescript
const response = await axios.get("/predictions?n_samples=50");
```

**Ahora**: Usa predicciones del contexto
```typescript
// Las predicciones ya están en contextPredictions desde el entrenamiento
```

## Flujo Completo

```
1. Usuario carga datos (CSV/Database)
   ↓
2. Usuario limpia datos (opcional)
   ↓
3. Usuario selecciona:
   - Columna objetivo
   - Tipo de tarea (regresión/clasificación)
   - Hiperparámetros (epochs, learning rate, test size)
   ↓
4. Entrenamiento en el navegador:
   - Preparación de datos
   - Normalización
   - Entrenamiento con TensorFlow.js
   - Generación de predicciones
   ↓
5. Resultados mostrados inmediatamente:
   - Métricas (R², RMSE, Accuracy, etc.)
   - Predicciones con errores
   - Gráficos interactivos
   ↓
6. Guardado en IndexedDB (local)
```

## Ventajas de la Migración

### 1. **Simplicidad**
- No requiere servidor Python corriendo
- No requiere instalación de scikit-learn, PyTorch, pandas, etc.
- Todo funciona en el navegador

### 2. **Rendimiento**
- Sin latencia de red
- Entrenamiento instantáneo para datasets pequeños/medianos
- Aprovecha GPU del navegador (WebGL)

### 3. **Portabilidad**
- Funciona offline
- Funciona en cualquier navegador moderno
- No requiere configuración de backend

### 4. **Privacidad**
- Los datos nunca salen del navegador
- Todo el procesamiento es local
- Ideal para datos sensibles

## Limitaciones

### 1. **Tamaño de Datos**
- Recomendado: < 10,000 filas
- El navegador tiene límites de memoria
- Para datasets grandes, considerar usar el backend Python

### 2. **Modelos Complejos**
- Modelos simples: ✅ Excelente
- Redes neuronales profundas: ⚠️ Limitado
- Ensemble methods (Random Forest, XGBoost): ❌ No disponible

### 3. **Algoritmos**
- Disponibles: Regresión lineal, Redes neuronales
- No disponibles: Random Forest, SVM, KNN, Gradient Boosting

## Próximos Pasos (Opcional)

Si necesitas más algoritmos, puedes:

1. **Agregar ml-knn**: Para K-Nearest Neighbors
2. **Agregar ml-random-forest**: Para Random Forest (limitado)
3. **Mantener backend Python**: Para modelos complejos y datasets grandes

## Uso

```typescript
import { trainModel } from '@/lib/ml-service';

const result = await trainModel(data, targetColumn, {
  taskType: 'regression', // o 'classification'
  modelType: 'linear',
  epochs: 50,
  learningRate: 0.01,
  testSize: 0.2
});

console.log(result.metrics); // { test_r2: 0.95, test_rmse: 2.3, ... }
console.log(result.predictions); // [{ sample_id: 1, true_value: 10, predicted_value: 9.8, ... }]
```

## Conclusión

La migración al frontend hace que la aplicación sea:
- ✅ Más simple de desplegar
- ✅ Más rápida para datasets pequeños/medianos
- ✅ Más privada (datos locales)
- ✅ Funcional offline

El backend Python ahora es **opcional** y solo se necesita para:
- Limpieza de datos con Pandas (aunque esto también podría migrarse)
- Modelos muy complejos
- Datasets muy grandes (> 10,000 filas)
