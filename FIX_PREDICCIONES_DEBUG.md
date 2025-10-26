# Fix: Debug de Predicciones en Módulo "Entrenar Modelos"

## 🐛 Problema Reportado

Al intentar generar predicciones después de entrenar un modelo, aparece el error:

```
"No se pudieron generar predicciones del conjunto de prueba."
```

---

## 🔍 Causa Probable

El backend está devolviendo una respuesta vacía (`predictions: []`) cuando se llama al endpoint `/predictions`. Esto puede ocurrir por varias razones:

### Posibles Causas

1. **`X_test` o `y_test` no se guardan correctamente**
   - El método `train()` no guarda los datos de prueba
   - Los datos se pierden después del entrenamiento

2. **`X_test` o `y_test` están vacíos**
   - El split de datos no genera conjunto de prueba
   - `test_size` es muy pequeño

3. **Formato incorrecto de datos**
   - `y_test` es un Series de pandas pero se accede como array
   - Problemas con índices

4. **Modelo no entrenado**
   - El trainer global es `None`
   - El modelo no se guardó correctamente

---

## ✅ Solución: Logs de Debug Mejorados

He agregado logs detallados para identificar exactamente dónde está el problema.

### 1. Logs en `ml_sklearn_service.py`

```python
def get_predictions_sample(self, n_samples: int = 10) -> Dict[str, Any]:
    """Get sample predictions from test set"""
    print(f"DEBUG get_predictions_sample: hasattr X_test={hasattr(self, 'X_test')}, hasattr y_test={hasattr(self, 'y_test')}")
    
    # Verificar si existen los atributos
    if not hasattr(self, 'X_test') or not hasattr(self, 'y_test'):
        print("DEBUG: No X_test o y_test disponible")
        return {"predictions": []}
    
    # Verificar si son None
    if self.X_test is None or self.y_test is None:
        print("DEBUG: X_test o y_test es None")
        return {"predictions": []}
    
    # Verificar si están vacíos
    if len(self.X_test) == 0 or len(self.y_test) == 0:
        print("DEBUG: X_test o y_test está vacío")
        return {"predictions": []}
    
    print(f"DEBUG: X_test shape={self.X_test.shape}, y_test shape={self.y_test.shape}")
    print(f"DEBUG: Generando {n_samples} predicciones")
    
    # ... resto del código ...
    
    print(f"DEBUG: Generadas {len(results)} predicciones")
    return {"predictions": results}
```

### 2. Fix de Acceso a Datos

```python
# Antes (podía fallar si y_test es un Series)
"true_value": float(y_true[i]) if not self.is_classification else int(y_true[i])

# Después (maneja tanto Series como arrays)
"true_value": float(y_true.iloc[i]) if hasattr(y_true, 'iloc') else (float(y_true[i]) if not self.is_classification else int(y_true[i]))
```

### 3. Logs en PyTorch

```python
def get_predictions_sample(self, n_samples: int = 10) -> Dict[str, Any]:
    """Get sample predictions from test set"""
    print(f"DEBUG PyTorch get_predictions_sample: hasattr X_test={hasattr(self, 'X_test')}, hasattr y_test={hasattr(self, 'y_test')}")
    
    if not hasattr(self, 'X_test') or not hasattr(self, 'y_test'):
        print("DEBUG PyTorch: No X_test o y_test disponible")
        return {"predictions": []}
    
    # ... resto de verificaciones ...
```

---

## 📊 Cómo Usar los Logs

### 1. Ejecutar el Backend

```bash
cd backend
python app.py
```

### 2. Entrenar un Modelo

En el frontend:
1. Cargar datos
2. Ir a "Entrenar Modelos"
3. Seleccionar columna objetivo
4. Entrenar modelo

**Logs esperados:**
```
DEBUG: sklearn_trainer is None: False
DEBUG: sklearn_trainer tiene X_test: True
DEBUG: X_test shape: (30, 4)
```

### 3. Generar Predicciones

Click en "Generar Predicciones del Test Set"

**Logs esperados (ÉXITO):**
```
DEBUG get_predictions_sample: hasattr X_test=True, hasattr y_test=True
DEBUG: X_test shape=(30, 4), y_test shape=(30,)
DEBUG: Generando 20 predicciones
DEBUG: Generadas 20 predicciones
```

**Logs esperados (ERROR):**
```
DEBUG get_predictions_sample: hasattr X_test=False, hasattr y_test=False
DEBUG: No X_test o y_test disponible
```

O:

```
DEBUG get_predictions_sample: hasattr X_test=True, hasattr y_test=True
DEBUG: X_test o y_test es None
```

O:

```
DEBUG get_predictions_sample: hasattr X_test=True, hasattr y_test=True
DEBUG: X_test o y_test está vacío
```

---

## 🔧 Diagnóstico Según Logs

### Caso 1: "No X_test o y_test disponible"

**Problema:** Los atributos no existen en el objeto

**Solución:**
```python
# Verificar que en train() se guardan los datos:
self.X_test = X_test  # Línea 146
self.y_test = y_test  # Línea 147
```

### Caso 2: "X_test o y_test es None"

**Problema:** Los atributos existen pero son None

**Solución:**
```python
# Verificar que prepare_data() devuelve datos válidos
X_train, X_test, y_train, y_test = self.prepare_data(df, target_column, test_size)
print(f"DEBUG train: X_test shape={X_test.shape}")
```

### Caso 3: "X_test o y_test está vacío"

**Problema:** El split generó arrays vacíos

**Solución:**
```python
# Verificar test_size
test_size = 0.2  # Debe ser > 0 y < 1
# Verificar que df tiene suficientes filas
print(f"DEBUG: df shape={df.shape}")
```

### Caso 4: "sklearn_trainer is None"

**Problema:** El trainer global no se guardó

**Solución:**
```python
# En /train-model endpoint, verificar:
global sklearn_trainer
sklearn_trainer = SklearnMLService()
result = sklearn_trainer.train(...)
print(f"DEBUG: sklearn_trainer guardado: {sklearn_trainer is not None}")
```

---

## 🧪 Prueba Manual

### Script de Prueba

```python
# test_predictions.py
import pandas as pd
from ml_sklearn_service import SklearnMLService

# Crear datos de prueba
df = pd.DataFrame({
    'feature1': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    'feature2': [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    'target': [0, 0, 0, 0, 0, 1, 1, 1, 1, 1]
})

# Entrenar modelo
trainer = SklearnMLService()
result = trainer.train(
    df=df,
    target_column='target',
    model_type='rf',
    task_type='classification',
    test_size=0.3
)

print(f"Entrenamiento completo")
print(f"X_test shape: {trainer.X_test.shape}")
print(f"y_test shape: {trainer.y_test.shape}")

# Generar predicciones
predictions = trainer.get_predictions_sample(n_samples=3)
print(f"Predicciones: {predictions}")
```

**Salida esperada:**
```
Entrenamiento completo
X_test shape: (3, 2)
y_test shape: (3,)
DEBUG get_predictions_sample: hasattr X_test=True, hasattr y_test=True
DEBUG: X_test shape=(3, 2), y_test shape=(3,)
DEBUG: Generando 3 predicciones
DEBUG: Generadas 3 predicciones
Predicciones: {'predictions': [
  {'sample_id': 1, 'true_value': 0, 'predicted_value': 0, 'confidence': 0.95},
  {'sample_id': 2, 'true_value': 1, 'predicted_value': 1, 'confidence': 0.87},
  {'sample_id': 3, 'true_value': 1, 'predicted_value': 1, 'confidence': 0.92}
]}
```

---

## 📁 Archivos Modificados

### 1. `backend/ml_sklearn_service.py` ✨

**Líneas 251-295:**
```python
def get_predictions_sample(self, n_samples: int = 10) -> Dict[str, Any]:
    # Logs de debug agregados
    print(f"DEBUG get_predictions_sample: hasattr X_test={hasattr(self, 'X_test')}, hasattr y_test={hasattr(self, 'y_test')}")
    
    # Verificaciones adicionales
    if not hasattr(self, 'X_test') or not hasattr(self, 'y_test'):
        print("DEBUG: No X_test o y_test disponible")
        return {"predictions": []}
    
    if self.X_test is None or self.y_test is None:
        print("DEBUG: X_test o y_test es None")
        return {"predictions": []}
    
    if len(self.X_test) == 0 or len(self.y_test) == 0:
        print("DEBUG: X_test o y_test está vacío")
        return {"predictions": []}
    
    # Logs de información
    print(f"DEBUG: X_test shape={self.X_test.shape}, y_test shape={self.y_test.shape}")
    print(f"DEBUG: Generando {n_samples} predicciones")
    
    # ... código de predicción ...
    
    # Fix de acceso a datos
    "true_value": float(y_true.iloc[i]) if hasattr(y_true, 'iloc') else (...)
    
    print(f"DEBUG: Generadas {len(results)} predicciones")
    return {"predictions": results}
```

### 2. `backend/ml_pytorch_service.py` ✨

**Líneas 402-457:**
```python
def get_predictions_sample(self, n_samples: int = 10) -> Dict[str, Any]:
    # Logs de debug agregados (mismo patrón que sklearn)
    print(f"DEBUG PyTorch get_predictions_sample: hasattr X_test={hasattr(self, 'X_test')}, hasattr y_test={hasattr(self, 'y_test')}")
    
    # Verificaciones adicionales
    # ... (mismo patrón) ...
    
    # Fix de acceso a datos
    "true_value": float(y_true.iloc[i]) if hasattr(y_true, 'iloc') else (...)
```

---

## ✅ Próximos Pasos

### 1. Ejecutar y Ver Logs

```bash
# Terminal 1: Backend
cd backend
python app.py

# Terminal 2: Frontend
npm run dev
```

### 2. Reproducir el Error

1. Cargar datos
2. Entrenar modelo
3. Generar predicciones
4. **Ver logs en la terminal del backend**

### 3. Identificar el Problema

Según los logs, sabrás exactamente qué está fallando:

- ✅ Si ves `"DEBUG: Generadas 20 predicciones"` → **Funciona correctamente**
- ❌ Si ves `"DEBUG: No X_test o y_test disponible"` → **Problema en train()**
- ❌ Si ves `"DEBUG: X_test o y_test es None"` → **Problema en prepare_data()**
- ❌ Si ves `"DEBUG: X_test o y_test está vacío"` → **Problema con test_size**

### 4. Reportar Logs

Copia los logs de la terminal y compártelos para identificar el problema exacto.

---

## 🎯 Resultado Esperado

### Logs de Éxito

```
INFO:     127.0.0.1:54321 - "POST /train-model HTTP/1.1" 200 OK
DEBUG: sklearn_trainer is None: False
DEBUG: sklearn_trainer tiene X_test: True
DEBUG: X_test shape: (30, 4)

INFO:     127.0.0.1:54322 - "GET /predictions?n_samples=20 HTTP/1.1" 200 OK
DEBUG get_predictions_sample: hasattr X_test=True, hasattr y_test=True
DEBUG: X_test shape=(30, 4), y_test shape=(30,)
DEBUG: Generando 20 predicciones
DEBUG: Generadas 20 predicciones
DEBUG: Predicciones generadas: 20
```

### Frontend

```
✅ "Se generaron 20 predicciones del conjunto de prueba"

Tabla:
ID | Real | Pred | Estado      | Conf
---|------|------|-------------|------
1  |  0   |  0   | ✓ Correcto  | 95.2%
2  |  1   |  1   | ✓ Correcto  | 87.3%
...
```

---

**Los logs de debug permitirán identificar exactamente dónde está el problema!** 🔍

**Ejecuta el backend y comparte los logs para diagnosticar el error.** 📋
