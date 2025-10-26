# Sistema de Predicciones - Documentación

## 📋 Cómo Funciona el Sistema de Predicciones

### Flujo Completo

```
1. Usuario carga datos (CSV o BD)
   ↓
2. Usuario selecciona columna objetivo (target)
   ↓
3. Usuario entrena modelo
   - Backend divide datos: 80% train, 20% test
   - Backend guarda X_test, y_test en memoria
   - Backend guarda modelo entrenado
   ↓
4. Usuario hace click en "Predecir"
   ↓
5. Backend usa X_test guardado para generar predicciones
   ↓
6. Frontend muestra predicciones con valores reales vs predichos
```

---

## 🎯 Entendiendo las Predicciones

### ¿Qué se predice?

El modelo predice la **columna objetivo** (target) basándose en las **otras columnas** (features).

### Ejemplo con Iris Dataset

**Datos:**
```
| sepal_length | sepal_width | petal_length | petal_width | species |
|--------------|-------------|--------------|-------------|---------|
| 5.1          | 3.5         | 1.4          | 0.2         | setosa  |
| 4.9          | 3.0         | 1.4          | 0.2         | setosa  |
| 6.3          | 3.3         | 6.0          | 2.5         | virginica |
```

**Si seleccionas `species` como columna objetivo:**
- **Features (X):** sepal_length, sepal_width, petal_length, petal_width
- **Target (y):** species
- **Predicción:** El modelo predice la especie basándose en las medidas

**Resultado de predicción:**
```json
{
  "sample_id": 1,
  "true_value": "setosa",        // Valor real de la columna species
  "predicted_value": "setosa",   // Valor predicho por el modelo
  "confidence": 0.985            // Confianza de la predicción (98.5%)
}
```

---

## 🔧 Implementación Técnica

### Backend - División de Datos

Durante el entrenamiento (`/train-model`):

```python
# 1. Separar features (X) y target (y)
X = df.drop(columns=[target_column])  # Todas las columnas excepto target
y = df[target_column]                  # Solo la columna target

# 2. Dividir en train y test (80/20)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# 3. Escalar datos
X_train = scaler.fit_transform(X_train)
X_test = scaler.transform(X_test)

# 4. Entrenar modelo
model.fit(X_train, y_train)

# 5. Guardar test set para predicciones
self.X_test = X_test  # Features del test set (escaladas)
self.y_test = y_test  # Valores reales del target
```

### Backend - Generar Predicciones

Cuando se llama a `/predictions`:

```python
def get_predictions_sample(self, n_samples: int = 10):
    # 1. Tomar primeras n_samples del test set
    X_sample = self.X_test[:n_samples]
    y_true = self.y_test[:n_samples]
    
    # 2. Hacer predicciones (X_test ya está escalado)
    predictions = self.model.predict(X_sample)
    
    # 3. Comparar con valores reales
    results = []
    for i in range(n_samples):
        results.append({
            "sample_id": i + 1,
            "true_value": y_true[i],        # Valor real
            "predicted_value": predictions[i],  # Valor predicho
            "confidence": ...  # Confianza (si es clasificación)
        })
    
    return {"predictions": results}
```

---

## 🐛 Problema Común: "No se encuentra el modelo"

### Causa

El error ocurre cuando:
1. El servidor backend se reinicia
2. Las variables globales se pierden
3. `sklearn_trainer` o `pytorch_trainer` vuelven a `None`

### Solución

**Opción 1: Volver a entrenar** (Temporal)
```
1. Entrenar modelo nuevamente
2. Hacer predicciones inmediatamente
```

**Opción 2: Persistir modelo** (Permanente)
```python
# Guardar modelo en disco
joblib.dump(model, 'model.pkl')

# Cargar modelo al iniciar
if os.path.exists('model.pkl'):
    sklearn_trainer = joblib.load('model.pkl')
```

### Debug

El backend ahora tiene logs de debug:

```python
print(f"DEBUG: sklearn_trainer is None: {sklearn_trainer is None}")
print(f"DEBUG: sklearn_trainer tiene X_test: {hasattr(sklearn_trainer, 'X_test')}")
```

Revisa la consola del backend para ver estos mensajes.

---

## 📊 Tipos de Predicciones

### Clasificación

**Ejemplo:** Predecir especie de iris

```json
{
  "sample_id": 1,
  "true_value": 1,              // Clase real (0, 1, 2)
  "predicted_value": 1,         // Clase predicha
  "confidence": 0.985,          // Confianza: 98.5%
  "probabilities": [0.005, 0.985, 0.010]  // Prob. de cada clase
}
```

**Interpretación:**
- El modelo predice clase 1 con 98.5% de confianza
- Hay 0.5% probabilidad de clase 0
- Hay 1.0% probabilidad de clase 2

### Regresión

**Ejemplo:** Predecir precio de casa

```json
{
  "sample_id": 1,
  "true_value": 250000.0,       // Precio real
  "predicted_value": 248500.0   // Precio predicho
}
```

**Interpretación:**
- Precio real: $250,000
- Precio predicho: $248,500
- Error: $1,500 (0.6%)

---

## 🎨 Interfaz de Usuario

### Visualización de Predicciones

```
┌─────────────────────────────────────────┐
│  📈 Predicciones Recientes              │
│  Últimas 20 predicciones del modelo     │
├─────────────────────────────────────────┤
│  Muestra #1                             │
│  [✓ Real: setosa | Pred: setosa] 98.5% │
│                                         │
│  Muestra #2                             │
│  [✓ Real: versicolor | Pred: versicolor] 95.2% │
│                                         │
│  Muestra #3                             │
│  [✗ Real: virginica | Pred: versicolor] 78.5% │
└─────────────────────────────────────────┘
```

**Colores:**
- ✅ Verde: Predicción correcta
- ❌ Rojo: Predicción incorrecta

---

## 🔍 Validaciones

### Frontend

```typescript
// 1. Verificar que modelo esté entrenado
if (!trainingComplete) {
  toast({ title: "Error", description: "Primero debes entrenar un modelo" });
  return;
}

// 2. Verificar que haya datos
if (!loadedData || !loadedData.rows.length === 0) {
  toast({ title: "Error", description: "No hay datos para predecir" });
  return;
}

// 3. Verificar columna objetivo
if (!targetColumn) {
  toast({ title: "Error", description: "Debes seleccionar una columna objetivo" });
  return;
}
```

### Backend

```python
# 1. Verificar que modelo exista
if sklearn_trainer is None and pytorch_trainer is None:
    return {"predictions": [], "message": "No model trained yet"}

# 2. Verificar que X_test exista
if not hasattr(self, 'X_test') or not hasattr(self, 'y_test'):
    return {"predictions": []}

# 3. Limitar número de predicciones
n_samples = min(n_samples, len(self.X_test))
```

---

## 📝 Ejemplo Completo

### Paso a Paso

**1. Cargar datos**
```
Archivo: iris.csv
Filas: 150
Columnas: sepal_length, sepal_width, petal_length, petal_width, species
```

**2. Seleccionar columna objetivo**
```
Target: species
Features: sepal_length, sepal_width, petal_length, petal_width
```

**3. Entrenar modelo**
```
Framework: Scikit-learn
Modelo: Random Forest
División: 80% train (120 filas), 20% test (30 filas)
Resultado: Accuracy 95%
```

**4. Hacer predicciones**
```
Click "Predecir" → 20 predicciones del test set

Predicción #1:
- Features: [5.1, 3.5, 1.4, 0.2]
- Real: setosa
- Predicho: setosa
- Confianza: 98.5% ✓

Predicción #2:
- Features: [6.3, 3.3, 6.0, 2.5]
- Real: virginica
- Predicho: virginica
- Confianza: 97.2% ✓
```

---

## 🚀 Mejoras Futuras

### 1. Predecir sobre Nuevos Datos

Actualmente: Predicciones sobre test set guardado
Mejora: Permitir subir nuevos datos para predecir

```typescript
// Frontend
const handlePredictNew = async (newData) => {
  await axios.post("/predict", {
    data: newData,
    columns: columns,
    framework: "sklearn"
  });
};
```

### 2. Persistencia de Modelos

Guardar modelo en disco para no perderlo al reiniciar:

```python
# Al entrenar
joblib.dump(sklearn_trainer, 'models/latest_sklearn.pkl')

# Al iniciar servidor
if os.path.exists('models/latest_sklearn.pkl'):
    sklearn_trainer = joblib.load('models/latest_sklearn.pkl')
```

### 3. Historial de Predicciones

Guardar todas las predicciones en Supabase:

```sql
CREATE TABLE prediction_history (
    id UUID PRIMARY KEY,
    model_id UUID,
    input_data JSONB,
    predicted_value TEXT,
    confidence FLOAT,
    created_at TIMESTAMP
);
```

---

## 🐛 Troubleshooting

### Error: "No model trained yet"

**Causa:** Variables globales perdidas
**Solución:** Entrenar modelo nuevamente

### Error: "No hay datos para predecir"

**Causa:** `loadedData` vacío
**Solución:** Cargar datos primero

### Error: "Debes seleccionar una columna objetivo"

**Causa:** `targetColumn` no seleccionado
**Solución:** Seleccionar columna en dropdown

### Predicciones = 0

**Causa:** `X_test` o `y_test` no guardados
**Solución:** Verificar que el entrenamiento completó correctamente

---

## ✅ Checklist de Funcionamiento

- [ ] Datos cargados
- [ ] Columna objetivo seleccionada
- [ ] Modelo entrenado (trainingComplete = true)
- [ ] Backend tiene sklearn_trainer o pytorch_trainer != None
- [ ] Backend tiene X_test y y_test guardados
- [ ] Click en "Predecir"
- [ ] Predicciones mostradas correctamente

---

## 📚 Referencias

- **Train/Test Split:** [Scikit-learn Documentation](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.train_test_split.html)
- **Predictions:** [Model.predict()](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestClassifier.html#sklearn.ensemble.RandomForestClassifier.predict)
- **Confidence:** [Model.predict_proba()](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestClassifier.html#sklearn.ensemble.RandomForestClassifier.predict_proba)
