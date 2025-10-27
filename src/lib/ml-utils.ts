import * as tf from '@tensorflow/tfjs';
import { TrainingResults, Prediction } from '@/contexts/DataContext';

export async function trainModel(
  data: any[],
  features: string[],
  target: string,
  framework: 'sklearn' | 'pytorch' = 'sklearn',
  modelType: string = 'classification'
): Promise<{ model: any; results: TrainingResults }> {
  // Convert data to tensors
  const featureValues = data.map(row => 
    features.map(feature => parseFloat(row[feature]) || 0)
  );
  
  const targetValues = data.map(row => {
    const val = row[target];
    // For classification, convert to 0/1 if it's a binary classification
    if (modelType === 'classification') {
      return typeof val === 'string' ? (val === 'true' || val === '1' ? 1 : 0) : val;
    }
    return parseFloat(val) || 0;
  });

  // Create a simple model
  const model = tf.sequential();
  
  if (modelType === 'classification') {
    model.add(tf.layers.dense({
      units: 10,
      activation: 'relu',
      inputShape: [features.length]
    }));
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
    model.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
  } else {
    // Regression
    model.add(tf.layers.dense({
      units: 10,
      activation: 'relu',
      inputShape: [features.length]
    }));
    model.add(tf.layers.dense({ units: 1 }));
    model.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError',
      metrics: ['mse']
    });
  }

  // Convert data to tensors
  const xs = tf.tensor2d(featureValues);
  const ys = tf.tensor1d(targetValues).reshape([-1, 1]);

  // Train the model
  const history = await model.fit(xs, ys, {
    epochs: 50,
    batchSize: 32,
    validationSplit: 0.2,
    callbacks: {
      onEpochEnd: (epoch: number, logs: any) => {
        console.log(`Epoch ${epoch}: loss = ${logs?.loss}`);
      }
    }
  });

  // Prepare results
  const results: TrainingResults = {
    framework: 'tensorflow-js',
    metrics: {
      train_accuracy: history.history.acc ? history.history.acc[history.history.acc.length - 1] : null,
      train_loss: history.history.loss[history.history.loss.length - 1],
      val_accuracy: history.history.val_acc ? history.history.val_acc[history.history.val_acc.length - 1] : null,
      val_loss: history.history.val_loss ? history.history.val_loss[history.history.val_loss.length - 1] : null,
      model_type: modelType
    },
    training_history: history.history,
    target_column: target,
    feature_columns: features
  };

  return { model, results };
}

export async function makePredictions(
  model: any,
  data: any[],
  features: string[],
  target: string,
  modelType: string = 'classification'
): Promise<Prediction[]> {
  if (!model || !data.length) return [];

  // Prepare features
  const featureValues = data.map(row => 
    features.map(feature => parseFloat(row[feature]) || 0)
  );

  // Make predictions
  const xs = tf.tensor2d(featureValues);
  const predictions = model.predict(xs);
  const predictionsData = await predictions.data();
  
  // Format results
  return data.map((row, idx) => {
    const predValue = predictionsData[idx];
    return {
      sample_id: row.id || `sample_${idx + 1}`,
      true_value: row[target],
      predicted_value: modelType === 'classification' ? 
        (predValue > 0.5 ? '1' : '0') : 
        predValue.toFixed(4),
      confidence: modelType === 'classification' ? 
        (predValue > 0.5 ? predValue : 1 - predValue) : 
        undefined,
      features: Object.fromEntries(
        Object.entries(row).filter(([key]) => key !== target)
      )
    };
  });
}
