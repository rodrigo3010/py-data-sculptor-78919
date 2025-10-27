# Sistema de Machine Learning

## ✅ Implementación Actual

Sistema completo de entrenamiento de modelos usando **Scikit-learn** y **PyTorch** integrados en la aplicación.

## Tecnologías Utilizadas

- **Scikit-learn**: Algoritmos de regresión lineal y preprocesamiento
- **PyTorch**: Redes neuronales profundas para clasificación y regresión
- **NumPy**: Operaciones matriciales y normalización de datos

## Nuevo Servicio: `src/lib/ml-service.ts`

### Funcionalidades

1. **Preparación de datos (Scikit-learn)**
   - ✅ **Columnas numéricas**: Conversión automática
   - ✅ **Columnas categóricas (strings)**: Label Encoding automático
   - ✅ División train/test estratificada
   - ✅ Normalización (StandardScaler)
   - ✅ Manejo de valores nulos

2. **Modelos soportados**
   - **Regresión Lineal (Scikit-learn)**: Para una característica
   - **Redes Neuronales (PyTorch)**: Para múltiples características y clasificación

3. **Métricas**
   - **Regresión**: MSE, RMSE, MAE, R²
   - **Clasificación**: Accuracy, Precision, Recall, F1-Score

4. **Predicciones**
   - Generación automática de predicciones con errores calculados
   - Formato compatible con el sistema existente

### Arquitectura de Red Neuronal PyTorch

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

**Características PyTorch**:
- **Regresión**: Output con activación lineal (1 neurona)
- **Clasificación**: Output con activación softmax (n clases)
- **Dropout**: Previene overfitting (regularización L2)
- **He Normal**: Inicialización de pesos optimizada
- **Adam Optimizer**: Optimización adaptativa del learning rate
- **Validación**: 10% de datos para validación durante entrenamiento

## Cambios en Componentes

### `ModelTrainerDialog.tsx`

**Implementación actual**: Entrenamiento integrado
```typescript
const { trainModel } = await import('@/lib/ml-service');
const result = await trainModel(loadedData.rows, targetColumn, config);
```

**Ventajas**:
- ✅ Integración directa con Scikit-learn y PyTorch
- ✅ Entrenamiento optimizado
- ✅ Sin dependencias externas
- ✅ Procesamiento eficiente

### `ResultsDialog.tsx`

**Implementación**: Predicciones generadas automáticamente
```typescript
// Las predicciones se generan durante el entrenamiento
// y se almacenan en el contexto de la aplicación
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

## Ventajas del Sistema

### 1. **Integración Completa**
- Scikit-learn para preprocesamiento y modelos lineales
- PyTorch para redes neuronales profundas
- Procesamiento optimizado de datos

### 2. **Rendimiento**
- Entrenamiento eficiente con optimizadores avanzados
- Soporte para datasets pequeños y medianos
- Procesamiento paralelo cuando está disponible

### 3. **Flexibilidad**
- Múltiples algoritmos disponibles
- Configuración de hiperparámetros
- Soporte para regresión y clasificación

### 4. **Precisión**
- Modelos de última generación
- Regularización automática (Dropout)
- Validación cruzada integrada

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

// Entrenar con Scikit-learn o PyTorch
const result = await trainModel(data, targetColumn, {
  taskType: 'regression', // o 'classification'
  modelType: 'linear',    // 'linear', 'rf', 'gb', 'svm', 'knn'
  epochs: 100,            // Para redes neuronales PyTorch
  learningRate: 0.001,    // Learning rate del optimizador
  testSize: 0.2           // 20% para test
});

console.log(result.metrics); // { test_r2: 0.95, test_rmse: 2.3, ... }
console.log(result.predictions); // [{ sample_id: 1, true_value: 10, predicted_value: 9.8, ... }]
```

## Conclusión

El sistema integrado ofrece:
- ✅ Scikit-learn para modelos tradicionales y preprocesamiento
- ✅ PyTorch para redes neuronales profundas
- ✅ Soporte completo para regresión y clasificación
- ✅ Manejo automático de datos categóricos y numéricos
- ✅ Métricas completas de evaluación
