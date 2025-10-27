# Guía: Predicción de Ganancia con Machine Learning

## 📋 Descripción General

Esta guía explica cómo usar el sistema para predecir la **ganancia** de películas basándose en características como nombre, país, género, inversión y fecha. Este es un problema de **regresión**, donde el objetivo es predecir un valor numérico continuo.

## 🎯 Concepto: ¿Qué es Regresión?

**Regresión** es una tarea de Machine Learning donde predecimos un **valor numérico** basándonos en otras características.

### Ejemplo con Películas

**Datos de entrada:**
```
| nombre          | pais   | genero | inversion | fecha      | ganancia |
|-----------------|--------|--------|-----------|------------|----------|
| Avatar          | USA    | Sci-Fi | 237000000 | 2009-12-18 | 2847246203 |
| Titanic         | USA    | Drama  | 200000000 | 1997-12-19 | 2187463944 |
| Avengers        | USA    | Action | 220000000 | 2012-05-04 | 1518812988 |
| Parasite        | Korea  | Drama  | 11400000  | 2019-05-30 | 258800000  |
```

**Objetivo:** Predecir la columna `ganancia` usando las demás columnas como características.

**Pregunta que responde el modelo:**
> "Dada la inversión, país, género y fecha de una película, ¿cuánto ganará?"

## 🚀 Paso a Paso: Entrenar Modelo de Predicción

### Paso 1: Preparar los Datos

1. **Cargar datos** en el módulo "Cargar Datos"
   - Sube un archivo CSV con columnas: `nombre`, `pais`, `genero`, `inversion`, `fecha`, `ganancia`
   - O conecta a una base de datos con esta información

2. **Limpiar datos** (opcional) en el módulo "Limpiar Datos"
   - Elimina valores nulos
   - Normaliza texto (mayúsculas/minúsculas)
   - Elimina duplicados

### Paso 2: Configurar el Modelo

1. Abre el módulo **"Entrenar Modelos"**

2. Selecciona el **framework**:
   - **Scikit-learn**: Más rápido, ideal para datasets pequeños/medianos
   - **PyTorch**: Más potente, ideal para datasets grandes

3. **Configuración para Scikit-learn:**
   ```
   Características (X): Selecciona columnas como: pais, genero, inversion, fecha
   Objetivo (Y): ganancia
   Tipo de Tarea: Regresión ⭐
   Tipo de modelo: Random Forest (recomendado) o Gradient Boosting
   Tamaño del conjunto de prueba: 20%
   ```

4. **Configuración para PyTorch:**
   ```
   Características (X): Selecciona columnas como: pais, genero, inversion, fecha
   Objetivo (Y): ganancia
   Tipo de Tarea: Regresión ⭐
   Capas ocultas: 3
   Neuronas por capa: 128
   Épocas: 50
   Tamaño del conjunto de prueba: 20%
   ```

### Paso 3: Entrenar el Modelo

1. Click en **"Entrenar Modelo"**
2. Espera a que complete (verás una barra de progreso)
3. El sistema automáticamente:
   - Divide los datos en 80% entrenamiento, 20% prueba
   - Preprocesa las características (escala números, codifica categorías)
   - Entrena el modelo
   - Evalúa el rendimiento

### Paso 4: Ver Resultados y Predicciones

1. Click en **"Siguiente: Ver Resultados"** o abre el módulo "Resultados"

2. En la pestaña **"Métricas"** verás:
   - **R² Score**: Qué tan bien el modelo explica la varianza (0-1, más alto = mejor)
   - **RMSE**: Error cuadrático medio (más bajo = mejor)
   - **MAE**: Error absoluto medio (más bajo = mejor)

3. En la pestaña **"Predicciones"** verás:
   - Lista de predicciones con valores reales vs predichos
   - **Gráfico de líneas**: Comparación visual real vs predicho
   - **Gráfico de errores**: Distribución del error por predicción
   - **Gráfico de dispersión**: Correlación entre valores reales y predichos
   - **Estadísticas de error**: Error promedio, mínimo y máximo

## 📊 Interpretación de Resultados

### Ejemplo de Predicción

```
Muestra #1
Real: 2847246203 | Pred: 2650000000
Error: 6.9%
```

**Interpretación:**
- El modelo predijo que la película ganaría $2,650,000,000
- La ganancia real fue $2,847,246,203
- El error fue de 6.9%, lo cual es bastante bueno

### Métricas de Regresión

#### R² Score (Coeficiente de Determinación)
- **Rango:** 0 a 1 (puede ser negativo si el modelo es muy malo)
- **Interpretación:**
  - 1.0 = Predicción perfecta
  - 0.8-0.9 = Muy bueno
  - 0.6-0.8 = Bueno
  - 0.4-0.6 = Regular
  - < 0.4 = Malo

**Ejemplo:** R² = 0.85 significa que el modelo explica el 85% de la varianza en la ganancia.

#### RMSE (Root Mean Squared Error)
- **Interpretación:** Error promedio en las mismas unidades que la variable objetivo
- **Ejemplo:** RMSE = 150,000,000 significa que en promedio el modelo se equivoca por $150 millones

#### MAE (Mean Absolute Error)
- **Interpretación:** Error absoluto promedio
- **Ejemplo:** MAE = 100,000,000 significa que en promedio el error es de $100 millones

### Gráficos de Predicción

#### 1. Comparación Real vs Predicho
- **Línea azul:** Valores reales
- **Línea verde:** Valores predichos
- **Ideal:** Las dos líneas deben estar muy cerca

#### 2. Distribución de Errores
- **Barras:** Porcentaje de error por cada predicción
- **Ideal:** Barras bajas y uniformes

#### 3. Gráfico de Dispersión
- **Puntos:** Cada predicción (X = real, Y = predicho)
- **Línea diagonal:** Predicción perfecta
- **Ideal:** Puntos cerca de la línea diagonal

## 🎨 Visualizaciones en el Módulo Resultados

### Pestaña "Predicciones"

```
┌─────────────────────────────────────────────────────┐
│  📈 Últimas Predicciones                            │
│                                                     │
│  Muestra #1                                         │
│  [Real: 2847246203 | Pred: 2650000000] Error: 6.9% │
│                                                     │
│  Muestra #2                                         │
│  [Real: 2187463944 | Pred: 2100000000] Error: 4.0% │
├─────────────────────────────────────────────────────┤
│  📊 Comparación Real vs Predicho                    │
│  [Gráfico de líneas con valores reales y predichos]│
├─────────────────────────────────────────────────────┤
│  📊 Distribución de Errores                         │
│  [Gráfico de barras con % de error por muestra]    │
├─────────────────────────────────────────────────────┤
│  📊 Gráfico de Dispersión                           │
│  [Scatter plot: Real vs Predicho]                   │
├─────────────────────────────────────────────────────┤
│  📊 Estadísticas de Error                           │
│  Error Promedio: 125M | Error % Promedio: 5.2%     │
│  Error Mínimo: 50M    | Error Máximo: 300M          │
└─────────────────────────────────────────────────────┘
```

## 💡 Consejos para Mejorar las Predicciones

### 1. Calidad de los Datos
- **Más datos = mejor modelo**: Intenta tener al menos 100-200 películas
- **Datos limpios**: Elimina valores nulos y duplicados
- **Datos relevantes**: Asegúrate de que las características realmente influyen en la ganancia

### 2. Selección de Características
**Buenas características para predecir ganancia:**
- ✅ Inversión (presupuesto)
- ✅ Género de la película
- ✅ País de producción
- ✅ Fecha de estreno (mes, año)
- ✅ Director famoso (si tienes esta info)
- ✅ Actores principales (si tienes esta info)

**Características que NO ayudan:**
- ❌ Nombre de la película (cada película es única)
- ❌ ID o identificadores únicos

### 3. Elección del Modelo

**Random Forest (Scikit-learn):**
- ✅ Bueno para datasets pequeños/medianos
- ✅ Rápido de entrenar
- ✅ Maneja bien características categóricas
- ✅ Proporciona feature importance

**Gradient Boosting (Scikit-learn):**
- ✅ Generalmente más preciso que Random Forest
- ⚠️ Más lento de entrenar
- ✅ Excelente para competencias

**Red Neuronal (PyTorch):**
- ✅ Mejor para datasets grandes (>1000 muestras)
- ✅ Puede capturar relaciones complejas
- ⚠️ Requiere más datos para entrenar bien
- ⚠️ Más lento de entrenar

### 4. Ajuste de Hiperparámetros

**Para Scikit-learn:**
- Activa "Optimización de hiperparámetros" (Grid Search)
- Esto encontrará automáticamente los mejores parámetros

**Para PyTorch:**
- Aumenta épocas si el modelo no converge (50-100)
- Aumenta neuronas si el dataset es complejo (128-256)
- Reduce learning rate si el entrenamiento es inestable (0.001-0.0001)

## 🔍 Ejemplo Completo: Dataset de Películas

### Datos de Entrada

```csv
nombre,pais,genero,inversion,fecha,ganancia
Avatar,USA,Sci-Fi,237000000,2009-12-18,2847246203
Titanic,USA,Drama,200000000,1997-12-19,2187463944
Avengers,USA,Action,220000000,2012-05-04,1518812988
Parasite,Korea,Drama,11400000,2019-05-30,258800000
Joker,USA,Drama,55000000,2019-10-04,1074251311
```

### Configuración del Modelo

```
Framework: Scikit-learn
Modelo: Random Forest
Características: pais, genero, inversion, fecha
Objetivo: ganancia
Tipo de Tarea: Regresión
Test Size: 20%
```

### Resultados Esperados

```
Métricas:
- R² Score: 0.82 (Bueno - explica 82% de la varianza)
- RMSE: 180,000,000 (Error promedio de $180M)
- MAE: 120,000,000 (Error absoluto promedio de $120M)

Predicciones:
Muestra #1: Real: 2847M | Pred: 2650M | Error: 6.9% ✅
Muestra #2: Real: 2187M | Pred: 2100M | Error: 4.0% ✅
Muestra #3: Real: 1518M | Pred: 1450M | Error: 4.5% ✅
```

## 🚨 Problemas Comunes y Soluciones

### Problema 1: R² Score muy bajo (< 0.4)
**Causas:**
- Datos insuficientes
- Características no relevantes
- Modelo muy simple

**Soluciones:**
- Consigue más datos
- Agrega más características relevantes
- Prueba un modelo más complejo (Gradient Boosting o PyTorch)

### Problema 2: Errores muy grandes
**Causas:**
- Outliers en los datos (películas con ganancias extremas)
- Escala de valores muy diferente

**Soluciones:**
- Limpia outliers en el módulo "Limpiar Datos"
- El sistema ya escala automáticamente, pero verifica los datos

### Problema 3: Overfitting (Train accuracy alta, Test accuracy baja)
**Causas:**
- Modelo muy complejo para pocos datos
- Demasiadas épocas en PyTorch

**Soluciones:**
- Reduce complejidad del modelo
- Reduce épocas en PyTorch
- Consigue más datos de entrenamiento

## 📚 Recursos Adicionales

### Documentación del Proyecto
- `ML_IMPLEMENTATION.md` - Documentación técnica completa
- `SISTEMA_PREDICCIONES.md` - Cómo funciona el sistema de predicciones
- `MEJORAS_MODULO_ENTRENAR.md` - Funcionalidades del módulo entrenar

### Conceptos de Machine Learning
- **Regresión vs Clasificación**: Regresión predice números, clasificación predice categorías
- **Train/Test Split**: Dividir datos para evaluar el modelo en datos no vistos
- **Overfitting**: Cuando el modelo memoriza en vez de aprender patrones generales
- **Feature Engineering**: Crear nuevas características a partir de las existentes

## ✅ Checklist de Éxito

- [ ] Datos cargados con al menos 100 muestras
- [ ] Columna objetivo (ganancia) es numérica
- [ ] Características seleccionadas son relevantes
- [ ] Tipo de tarea configurado como "Regresión"
- [ ] Modelo entrenado exitosamente
- [ ] R² Score > 0.6
- [ ] Predicciones generadas y visualizadas
- [ ] Gráficos muestran buena correlación entre real y predicho

## 🎯 Conclusión

Con este sistema puedes:
1. ✅ Predecir la ganancia de películas basándote en características
2. ✅ Visualizar las predicciones de forma gráfica
3. ✅ Evaluar el rendimiento del modelo con múltiples métricas
4. ✅ Comparar diferentes modelos (Scikit-learn vs PyTorch)
5. ✅ Exportar y guardar los resultados

**¡Ahora estás listo para predecir ganancias con Machine Learning!** 🚀

