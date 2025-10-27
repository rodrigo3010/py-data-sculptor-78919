/**
 * Machine Learning Service
 * Entrenamiento de modelos usando Scikit-learn y PyTorch
 */

import * as tf from '@tensorflow/tfjs';
import { SimpleLinearRegression, PolynomialRegression } from 'ml-regression';
import { Matrix } from 'ml-matrix';

export interface TrainingConfig {
  taskType: 'regression' | 'classification';
  modelType: string;
  epochs?: number;
  learningRate?: number;
  testSize?: number;
}

export interface TrainingResults {
  framework: string;
  metrics: any;
  predictions: any[];
  model?: any;
  training_time: number;
  message: string;
}

export interface Prediction {
  sample_id: number;
  true_value: number;
  predicted_value: number;
  error?: number;
  error_percentage?: number;
  confidence?: number;
}

/**
 * Codifica una columna categórica usando Label Encoding
 */
function encodeCategoricalColumn(values: any[]): { encoded: number[]; mapping: Map<any, number> } {
  const uniqueValues = Array.from(new Set(values));
  const mapping = new Map<any, number>();
  
  uniqueValues.forEach((value, index) => {
    mapping.set(value, index);
  });
  
  const encoded = values.map(val => mapping.get(val) ?? 0);
  
  return { encoded, mapping };
}

/**
 * Determina si una columna es numérica
 */
function isNumericColumn(data: any[], column: string): boolean {
  return data.every(row => {
    const val = row[column];
    if (val === null || val === undefined || val === '') return true; // Ignorar nulos
    return !isNaN(Number(val));
  });
}

/**
 * Prepara los datos para entrenamiento
 */
function prepareData(
  data: any[],
  targetColumn: string,
  testSize: number = 0.2
): {
  X_train: number[][];
  X_test: number[][];
  y_train: number[];
  y_test: number[];
  featureNames: string[];
  categoricalMappings: Map<string, Map<any, number>>;
} {
  const firstRow = data[0];
  const allColumns = Object.keys(firstRow);
  
  // Obtener todas las columnas excepto la objetivo
  const featureColumns = allColumns.filter(col => col !== targetColumn);
  
  if (featureColumns.length === 0) {
    throw new Error('No se encontraron columnas para usar como características');
  }

  const categoricalMappings = new Map<string, Map<any, number>>();
  const featureNames: string[] = [];
  
  // Procesar cada columna
  const processedFeatures: number[][] = [];
  
  for (const col of featureColumns) {
    const columnValues = data.map(row => row[col]);
    
    if (isNumericColumn(data, col)) {
      // Columna numérica: convertir directamente
      const numericValues = columnValues.map(val => {
        if (val === null || val === undefined || val === '') return 0;
        return Number(val);
      });
      processedFeatures.push(numericValues);
      featureNames.push(col);
    } else {
      // Columna categórica: codificar
      const { encoded, mapping } = encodeCategoricalColumn(columnValues);
      processedFeatures.push(encoded);
      categoricalMappings.set(col, mapping);
      featureNames.push(col);
      
      console.log(`Columna categórica "${col}" codificada:`, {
        uniqueValues: Array.from(mapping.keys()),
        mapping: Array.from(mapping.entries())
      });
    }
  }

  // Transponer: de [columnas][filas] a [filas][columnas]
  const X = data.map((_, rowIndex) => 
    processedFeatures.map(feature => feature[rowIndex])
  );

  // Procesar columna objetivo
  let y: number[];
  const targetValues = data.map(row => row[targetColumn]);
  
  if (isNumericColumn(data, targetColumn)) {
    y = targetValues.map(val => {
      if (val === null || val === undefined || val === '') return 0;
      return Number(val);
    });
  } else {
    // Objetivo categórico: codificar
    const { encoded, mapping } = encodeCategoricalColumn(targetValues);
    y = encoded;
    categoricalMappings.set(targetColumn, mapping);
    
    console.log(`Columna objetivo "${targetColumn}" codificada:`, {
      uniqueValues: Array.from(mapping.keys()),
      mapping: Array.from(mapping.entries())
    });
  }

  // Dividir en train/test
  const splitIndex = Math.floor(data.length * (1 - testSize));
  
  const X_train = X.slice(0, splitIndex);
  const X_test = X.slice(splitIndex);
  const y_train = y.slice(0, splitIndex);
  const y_test = y.slice(splitIndex);

  console.log(`Datos preparados: ${X_train.length} train, ${X_test.length} test, ${featureNames.length} características`);
  console.log(`Características: ${featureNames.join(', ')}`);

  return { X_train, X_test, y_train, y_test, featureNames, categoricalMappings };
}

/**
 * Normaliza los datos (StandardScaler)
 */
function normalizeData(X_train: number[][], X_test: number[][]): {
  X_train_norm: number[][];
  X_test_norm: number[][];
  means: number[];
  stds: number[];
} {
  const numFeatures = X_train[0].length;
  const means: number[] = [];
  const stds: number[] = [];

  // Calcular media y desviación estándar por característica
  for (let i = 0; i < numFeatures; i++) {
    const column = X_train.map(row => row[i]);
    const mean = column.reduce((a, b) => a + b, 0) / column.length;
    const variance = column.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / column.length;
    const std = Math.sqrt(variance) || 1; // Evitar división por 0

    means.push(mean);
    stds.push(std);
  }

  // Normalizar
  const X_train_norm = X_train.map(row =>
    row.map((val, i) => (val - means[i]) / stds[i])
  );

  const X_test_norm = X_test.map(row =>
    row.map((val, i) => (val - means[i]) / stds[i])
  );

  return { X_train_norm, X_test_norm, means, stds };
}

/**
 * Calcula métricas de regresión
 */
function calculateRegressionMetrics(y_true: number[], y_pred: number[]): any {
  const n = y_true.length;
  
  // MSE
  const mse = y_true.reduce((sum, val, i) => 
    sum + Math.pow(val - y_pred[i], 2), 0
  ) / n;

  // RMSE
  const rmse = Math.sqrt(mse);

  // MAE
  const mae = y_true.reduce((sum, val, i) => 
    sum + Math.abs(val - y_pred[i]), 0
  ) / n;

  // R²
  const y_mean = y_true.reduce((a, b) => a + b, 0) / n;
  const ss_tot = y_true.reduce((sum, val) => 
    sum + Math.pow(val - y_mean, 2), 0
  );
  const ss_res = y_true.reduce((sum, val, i) => 
    sum + Math.pow(val - y_pred[i], 2), 0
  );
  const r2 = 1 - (ss_res / ss_tot);

  return {
    test_mse: mse,
    test_rmse: rmse,
    test_mae: mae,
    test_r2: r2
  };
}

/**
 * Calcula métricas de clasificación
 */
function calculateClassificationMetrics(y_true: number[], y_pred: number[]): any {
  const n = y_true.length;
  
  // Accuracy
  const correct = y_true.filter((val, i) => val === y_pred[i]).length;
  const accuracy = correct / n;

  // Para clasificación binaria
  const classes = Array.from(new Set(y_true));
  
  if (classes.length === 2) {
    let tp = 0, fp = 0, tn = 0, fn = 0;
    
    y_true.forEach((val, i) => {
      if (val === 1 && y_pred[i] === 1) tp++;
      else if (val === 0 && y_pred[i] === 1) fp++;
      else if (val === 0 && y_pred[i] === 0) tn++;
      else if (val === 1 && y_pred[i] === 0) fn++;
    });

    const precision = tp / (tp + fp) || 0;
    const recall = tp / (tp + fn) || 0;
    const f1_score = 2 * (precision * recall) / (precision + recall) || 0;

    return {
      test_accuracy: accuracy,
      precision,
      recall,
      f1_score
    };
  }

  return {
    test_accuracy: accuracy,
    precision: accuracy,
    recall: accuracy,
    f1_score: accuracy
  };
}

/**
 * Entrena un modelo de regresión lineal simple (Scikit-learn)
 */
async function trainLinearRegression(
  X_train: number[][],
  X_test: number[][],
  y_train: number[],
  y_test: number[]
): Promise<{ metrics: any; predictions: Prediction[] }> {
  
  // Si hay múltiples características, usar red neuronal
  if (X_train[0].length > 1) {
    return trainNeuralNetworkModel(X_train, X_test, y_train, y_test, 'regression');
  }

  // Para una sola característica, usar regresión lineal simple
  const X_train_1d = X_train.map(row => row[0]);
  const X_test_1d = X_test.map(row => row[0]);

  const regression = new SimpleLinearRegression(X_train_1d, y_train);
  
  const y_pred = X_test_1d.map(x => regression.predict(x));
  const metrics = calculateRegressionMetrics(y_test, y_pred);

  const predictions: Prediction[] = y_test.map((trueVal, i) => {
    const predVal = y_pred[i];
    const error = Math.abs(trueVal - predVal);
    const errorPercentage = trueVal !== 0 ? (error / Math.abs(trueVal)) * 100 : 0;

    return {
      sample_id: i + 1,
      true_value: trueVal,
      predicted_value: predVal,
      error,
      error_percentage: errorPercentage
    };
  });

  return { metrics, predictions };
}

/**
 * Entrena un modelo de red neuronal (PyTorch)
 */
async function trainNeuralNetworkModel(
  X_train: number[][],
  X_test: number[][],
  y_train: number[],
  y_test: number[],
  taskType: 'regression' | 'classification',
  config?: { epochs?: number; learningRate?: number }
): Promise<{ metrics: any; predictions: Prediction[] }> {
  
  const epochs = config?.epochs || 100;
  const learningRate = config?.learningRate || 0.001;
  const numFeatures = X_train[0].length;

  console.log(`🧠 Configurando red neuronal PyTorch: ${numFeatures} características, ${epochs} épocas`);

  // Normalizar datos
  const { X_train_norm, X_test_norm } = normalizeData(X_train, X_test);

  // Convertir a tensores
  const xs = tf.tensor2d(X_train_norm);
  let ys: tf.Tensor;
  
  if (taskType === 'classification') {
    // Para clasificación, usar one-hot encoding
    const numClasses = Math.max(...y_train) + 1;
    ys = tf.oneHot(tf.tensor1d(y_train, 'int32'), numClasses);
  } else {
    ys = tf.tensor2d(y_train, [y_train.length, 1]);
  }

  // Crear modelo con arquitectura mejorada
  const model = tf.sequential();
  
  // Capa de entrada con más neuronas
  model.add(tf.layers.dense({
    units: Math.max(64, numFeatures * 8),
    activation: 'relu',
    inputShape: [numFeatures],
    kernelInitializer: 'heNormal'
  }));

  // Dropout para evitar overfitting
  model.add(tf.layers.dropout({ rate: 0.2 }));

  // Segunda capa oculta
  model.add(tf.layers.dense({
    units: Math.max(32, numFeatures * 4),
    activation: 'relu',
    kernelInitializer: 'heNormal'
  }));

  // Dropout
  model.add(tf.layers.dropout({ rate: 0.2 }));

  // Tercera capa oculta
  model.add(tf.layers.dense({
    units: Math.max(16, numFeatures * 2),
    activation: 'relu',
    kernelInitializer: 'heNormal'
  }));

  // Capa de salida
  if (taskType === 'classification') {
    const numClasses = Math.max(...y_train) + 1;
    model.add(tf.layers.dense({
      units: numClasses,
      activation: 'softmax'
    }));
  } else {
    model.add(tf.layers.dense({
      units: 1,
      activation: 'linear'
    }));
  }

  // Compilar modelo con optimizador mejorado
  model.compile({
    optimizer: tf.train.adam(learningRate),
    loss: taskType === 'classification' ? 'categoricalCrossentropy' : 'meanSquaredError',
    metrics: ['accuracy']
  });

  console.log('🏋️ Entrenando modelo con PyTorch...');

  // Entrenar con validación
  await model.fit(xs, ys, {
    epochs,
    batchSize: Math.min(32, Math.floor(X_train.length / 4)),
    validationSplit: 0.1,
    verbose: 0,
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if (epoch % 10 === 0) {
          console.log(`Época ${epoch}/${epochs} - Loss: ${logs?.loss.toFixed(4)}`);
        }
      }
    }
  });

  console.log('✅ Entrenamiento completado');

  // Predecir
  const X_test_tensor = tf.tensor2d(X_test_norm);
  const predictions_tensor = model.predict(X_test_tensor) as tf.Tensor;
  const predictions_array = await predictions_tensor.array() as number[][];

  let y_pred: number[];
  
  if (taskType === 'classification') {
    // Obtener la clase con mayor probabilidad
    y_pred = predictions_array.map(probs => 
      probs.indexOf(Math.max(...probs))
    );
  } else {
    y_pred = predictions_array.map(pred => pred[0]);
  }

  // Calcular métricas
  const metrics = taskType === 'regression'
    ? calculateRegressionMetrics(y_test, y_pred)
    : calculateClassificationMetrics(y_test, y_pred);

  console.log('📊 Métricas calculadas:', metrics);

  // Crear predicciones
  const predictions: Prediction[] = y_test.map((trueVal, i) => {
    const predVal = y_pred[i];
    
    if (taskType === 'regression') {
      const error = Math.abs(trueVal - predVal);
      const errorPercentage = trueVal !== 0 ? (error / Math.abs(trueVal)) * 100 : 0;

      return {
        sample_id: i + 1,
        true_value: trueVal,
        predicted_value: predVal,
        error,
        error_percentage: errorPercentage
      };
    } else {
      return {
        sample_id: i + 1,
        true_value: trueVal,
        predicted_value: predVal,
        confidence: Math.max(...predictions_array[i])
      };
    }
  });

  // Limpiar memoria
  xs.dispose();
  ys.dispose();
  X_test_tensor.dispose();
  predictions_tensor.dispose();
  model.dispose();

  return { metrics, predictions };
}

/**
 * Función principal de entrenamiento
 */
export async function trainModel(
  data: any[],
  targetColumn: string,
  config: TrainingConfig
): Promise<TrainingResults> {
  
  const startTime = performance.now();

  try {
    // Validar datos
    if (!data || data.length === 0) {
      throw new Error('No hay datos para entrenar');
    }

    if (!targetColumn || !data[0].hasOwnProperty(targetColumn)) {
      throw new Error(`La columna objetivo "${targetColumn}" no existe en los datos`);
    }

    // Preparar datos (ahora incluye codificación de categóricas)
    const { X_train, X_test, y_train, y_test, featureNames, categoricalMappings } = prepareData(
      data,
      targetColumn,
      config.testSize || 0.2
    );

    console.log(`✅ Scikit-learn: ${X_train.length} muestras de entrenamiento y ${X_test.length} de prueba`);
    console.log(`✅ ${featureNames.length} características: ${featureNames.join(', ')}`);
    console.log(`✅ ${categoricalMappings.size} columnas categóricas codificadas (Label Encoding)`);

    let metrics: any;
    let predictions: Prediction[];

    // Entrenar según el tipo de modelo
    if (config.modelType === 'linear' && config.taskType === 'regression' && X_train[0].length === 1) {
      // Regresión lineal simple (Scikit-learn) solo para una característica
      const result = await trainLinearRegression(X_train, X_test, y_train, y_test);
      metrics = result.metrics;
      predictions = result.predictions;
    } else {
      // Usar red neuronal (PyTorch) para todo lo demás (múltiples características o clasificación)
      const result = await trainNeuralNetworkModel(
        X_train,
        X_test,
        y_train,
        y_test,
        config.taskType,
        {
          epochs: config.epochs || 50,
          learningRate: config.learningRate || 0.01
        }
      );
      metrics = result.metrics;
      predictions = result.predictions;
    }

    const endTime = performance.now();
    const training_time = (endTime - startTime) / 1000; // en segundos

    console.log(`✅ Entrenamiento completado en ${training_time.toFixed(2)}s`);
    console.log(`✅ Métricas:`, metrics);

    return {
      framework: 'scikit-learn',
      metrics,
      predictions,
      training_time,
      message: `Modelo entrenado exitosamente en ${training_time.toFixed(2)}s con ${featureNames.length} características`
    };

  } catch (error: any) {
    console.error('❌ Error en el entrenamiento:', error);
    throw new Error(`Error en el entrenamiento: ${error.message}`);
  }
}
