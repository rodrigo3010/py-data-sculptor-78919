# Implementación de Machine Learning con Scikit-learn y PyTorch

## Descripción General

Este proyecto implementa un sistema completo de entrenamiento de modelos de Machine Learning utilizando **Scikit-learn** para modelos tradicionales y **PyTorch** para redes neuronales profundas. El sistema incluye:

- Entrenamiento de modelos
- Predicciones en tiempo real
- Métricas de evaluación
- Visualizaciones estadísticas
- Persistencia de modelos

## Arquitectura del Sistema

### Backend (Python/FastAPI)

```
backend/
├── app.py                      # API principal con endpoints ML
├── ml_sklearn_service.py       # Servicio de entrenamiento Scikit-learn
├── ml_pytorch_service.py       # Servicio de entrenamiento PyTorch
├── visualization_service.py    # Generación de gráficos
├── requirements.txt            # Dependencias Python
└── models/                     # Modelos entrenados guardados
```

### Frontend (React/TypeScript)

```
src/
├── contexts/DataContext.tsx           # Estado global con resultados
├── components/modules/
│   ├── ModelTrainerDialog.tsx         # UI para entrenar modelos
│   └── ResultsDialog.tsx              # UI para visualizar resultados
```

## Servicios Backend

### 1. Scikit-learn Service (`ml_sklearn_service.py`)

**Modelos Soportados:**
- Regresión Lineal
- Regresión Logística
- Random Forest (Clasificación/Regresión)
- Gradient Boosting (Clasificación/Regresión)
- SVM (Support Vector Machines)
- K-Nearest Neighbors

**Características:**
- Preprocesamiento automático de datos
- Escalado de características con StandardScaler
- Codificación de variables categóricas
- División train/test configurable
- Cross-validation (K-Fold)
- Optimización de hiperparámetros:
  - Grid Search
  - Random Search
- Métricas de evaluación:
  - Clasificación: Accuracy, Precision, Recall, F1-Score, AUC-ROC
  - Regresión: MSE, RMSE, MAE, R²
- Feature importance (para modelos basados en árboles)
- Matriz de confusión
- Curva ROC (clasificación binaria)

**Ejemplo de uso:**

```python
from ml_sklearn_service import SklearnModelTrainer

trainer = SklearnModelTrainer()

# Entrenar modelo
metrics = trainer.train(
    df=dataframe,
    target_column="target",
    model_type="rf",  # Random Forest
    task_type="classification",
    test_size=0.2,
    cv_folds=5,
    optimize_hyperparams="grid"
)

# Hacer predicciones
predictions = trainer.predict(X_new)

# Guardar modelo
trainer.save_model("my_model")
```

### 2. PyTorch Service (`ml_pytorch_service.py`)

**Arquitecturas Soportadas:**
- MLP (Multi-Layer Perceptron)
- Extensible para CNN, RNN, LSTM, Transformer

**Características:**
- Redes neuronales personalizables:
  - Número de capas ocultas
  - Neuronas por capa
  - Funciones de activación (ReLU, Leaky ReLU, Sigmoid, Tanh, GELU)
- Optimizadores:
  - Adam
  - SGD con momentum
  - AdamW
  - RMSprop
- Funciones de pérdida:
  - Cross Entropy (clasificación)
  - Binary Cross Entropy
  - MSE Loss (regresión)
  - MAE Loss
- Training con validación
- Historia de entrenamiento (loss y accuracy por época)
- Soporte para GPU automático
- Early stopping potencial
- Batch processing

**Ejemplo de uso:**

```python
from ml_pytorch_service import PyTorchModelTrainer

trainer = PyTorchModelTrainer()

# Entrenar red neuronal
results = trainer.train(
    df=dataframe,
    target_column="target",
    architecture="mlp",
    hidden_layers=3,
    neurons_per_layer=128,
    activation="relu",
    optimizer_name="adam",
    learning_rate=0.001,
    epochs=50,
    batch_size=32,
    loss_function="cross_entropy"
)

# Acceder a historia de entrenamiento
history = results["training_history"]
print(f"Train loss: {history['train_loss']}")
print(f"Val accuracy: {history['val_acc']}")
```

### 3. Visualization Service (`visualization_service.py`)

**Gráficos Generados:**

1. **Matriz de Confusión** (Clasificación)
   - Heatmap con valores reales vs predichos
   
2. **Curva ROC** (Clasificación Binaria)
   - True Positive Rate vs False Positive Rate
   - Cálculo de AUC
   
3. **Feature Importance** (Scikit-learn)
   - Top 10 características más importantes
   - Gráfico de barras horizontal
   
4. **Curva de Aprendizaje** (PyTorch)
   - Training vs Validation Loss
   - Training vs Validation Accuracy
   
5. **Comparación de Métricas**
   - Gráfico de barras con todas las métricas
   
6. **Cross-Validation Scores** (Scikit-learn)
   - Scores por fold con media y desviación estándar

**Formato de salida:**
- Imágenes en formato Base64 (PNG)
- Listas para integración directa en frontend

## API Endpoints

### POST `/train-model`

Entrena un modelo de ML con Scikit-learn o PyTorch.

**Request Body:**
```json
{
  "framework": "sklearn" | "pytorch",
  "data": [...],
  "columns": [...],
  "target_column": "target",
  "model_type": "rf",
  "task_type": "classification",
  "test_size": 0.2,
  
  // Scikit-learn específico
  "cv_folds": 5,
  "optimize_hyperparams": "grid",
  "metric": "accuracy",
  
  // PyTorch específico
  "architecture": "mlp",
  "hidden_layers": 3,
  "neurons_per_layer": 128,
  "activation": "relu",
  "optimizer": "adam",
  "learning_rate": 0.001,
  "epochs": 50,
  "batch_size": 32,
  "loss_function": "cross_entropy"
}
```

**Response:**
```json
{
  "success": true,
  "framework": "sklearn",
  "metrics": {
    "test_accuracy": 0.943,
    "precision": 0.928,
    "recall": 0.912,
    "f1_score": 0.920,
    "confusion_matrix": [[850, 42], [38, 870]],
    "feature_importance": [...]
  },
  "plots": {
    "confusion_matrix": "data:image/png;base64,...",
    "roc_curve": "data:image/png;base64,...",
    "feature_importance": "data:image/png;base64,..."
  },
  "message": "Modelo entrenado exitosamente"
}
```

### GET `/predictions?n_samples=10`

Obtiene predicciones de muestra del último modelo entrenado.

**Response:**
```json
{
  "predictions": [
    {
      "sample_id": 1,
      "true_value": 1,
      "predicted_value": 1,
      "confidence": 0.95,
      "probabilities": [0.05, 0.95]
    }
  ],
  "framework": "sklearn",
  "is_classification": true
}
```

### POST `/predict`

Hace predicciones con un modelo entrenado.

**Request Body:**
```json
{
  "framework": "sklearn",
  "data": [...],
  "columns": [...],
  "model_name": "my_model"
}
```

### POST `/save-model?framework=sklearn&model_name=my_model`

Guarda el modelo entrenado en disco.

**Response:**
```json
{
  "success": true,
  "model_path": "models/my_model.joblib",
  "message": "Modelo guardado exitosamente"
}
```

## Frontend Integration

### DataContext

El contexto global almacena:
- `loadedData`: Datos cargados desde CSV
- `trainingResults`: Resultados del entrenamiento
- `completedModules`: Estado de módulos completados

### ModelTrainerDialog

**Características:**
- Selección de framework (Scikit-learn/PyTorch)
- Configuración de hiperparámetros
- Selección de columna objetivo
- Tipo de tarea (clasificación/regresión)
- Barra de progreso durante entrenamiento
- Validación de datos antes de entrenar

**Flujo:**
1. Usuario selecciona framework
2. Configura parámetros del modelo
3. Selecciona columna objetivo
4. Inicia entrenamiento
5. Progreso visual en tiempo real
6. Resultados guardados en contexto
7. Navegación automática a ResultsDialog

### ResultsDialog

**Pestañas:**

1. **Métricas**
   - Cards con métricas principales
   - Matriz de confusión (si aplica)
   - Curva ROC (clasificación binaria)

2. **Predicciones**
   - Últimas 10 predicciones
   - Comparación real vs predicho
   - Nivel de confianza

3. **Análisis**
   - Curva de aprendizaje (PyTorch)
   - Feature importance (Scikit-learn)
   - Estadísticas del modelo

**Acciones:**
- Exportar resultados
- Guardar modelo entrenado

## Instalación y Configuración

### Backend

1. Instalar dependencias:
```bash
cd backend
pip install -r requirements.txt
```

2. Iniciar servidor:
```bash
python app.py
```

El servidor estará disponible en `http://161.132.54.35:5050`

### Frontend

1. Instalar dependencias:
```bash
npm install
```

2. Iniciar desarrollo:
```bash
npm run dev
```

## Dependencias Principales

### Backend
- `fastapi==0.109.2` - Framework web
- `scikit-learn==1.4.0` - ML tradicional
- `torch==2.2.0` - Deep learning
- `pandas==2.2.0` - Manipulación de datos
- `numpy==1.26.4` - Operaciones numéricas
- `matplotlib==3.8.2` - Visualizaciones
- `seaborn==0.13.2` - Gráficos estadísticos
- `joblib==1.3.2` - Persistencia de modelos

### Frontend
- `react` - UI framework
- `axios` - HTTP client
- `recharts` - Gráficos interactivos
- `shadcn/ui` - Componentes UI

## Casos de Uso

### 1. Clasificación Binaria con Random Forest

```python
# Backend automáticamente:
# - Preprocesa datos
# - Divide train/test
# - Entrena modelo
# - Calcula métricas
# - Genera visualizaciones
```

### 2. Regresión con Red Neuronal

```python
# PyTorch automáticamente:
# - Crea arquitectura MLP
# - Entrena con backpropagation
# - Valida en cada época
# - Guarda historia de entrenamiento
```

### 3. Optimización de Hiperparámetros

```python
# Grid Search automático para encontrar
# mejores parámetros del modelo
```

## Mejoras Futuras

1. **Modelos adicionales:**
   - XGBoost
   - LightGBM
   - CatBoost

2. **Arquitecturas PyTorch:**
   - CNN para imágenes
   - RNN/LSTM para series temporales
   - Transformers

3. **Características avanzadas:**
   - AutoML
   - Ensemble methods
   - Feature engineering automático
   - Explicabilidad (SHAP, LIME)

4. **Optimización:**
   - Entrenamiento distribuido
   - Cuantización de modelos
   - Pruning

5. **Deployment:**
   - Exportar a ONNX
   - Servir modelos con TorchServe
   - API de inferencia optimizada

## Troubleshooting

### Error: "No hay datos cargados"
- Asegúrate de cargar datos en el módulo "Cargar Datos" primero

### Error: "Target column not found"
- Verifica que la columna objetivo existe en los datos

### PyTorch no usa GPU
- Instala versión CUDA de PyTorch: `pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118`

### Memoria insuficiente
- Reduce `batch_size` en PyTorch
- Reduce número de muestras en dataset

## Conclusión

Este sistema proporciona una plataforma completa y profesional para entrenamiento de modelos de Machine Learning, combinando la facilidad de uso de Scikit-learn con el poder de PyTorch para deep learning, todo integrado en una interfaz web moderna y reactiva.
