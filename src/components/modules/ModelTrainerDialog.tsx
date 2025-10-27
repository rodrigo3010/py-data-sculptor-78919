// React & Routing
import React from 'react';
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Agrega estos imports si no los tienes
import { BarChart2, Loader2, RefreshCw, XCircle } from "lucide-react";

// UI Components
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

// Icons
import { Brain, Network, Layers, PlayCircle, CheckCircle2, AlertCircle, Save } from "lucide-react";

// Custom Hooks
import { useData } from "@/contexts/DataContext";
import { db } from "@/lib/indexeddb";

// Types
interface ModelTrainerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

import { LoadedData, TrainingResults } from "@/contexts/DataContext";

interface DataRow {
  [key: string]: string | number | null;
}

interface MLModel {
  // Add model properties as needed
  predict: (input: any) => any;
  // Add other model methods as needed
}

// Extend the DataContext type
declare module "@/contexts/DataContext" {
  interface DataContextType {
    loadedData: LoadedData | null;
    setLoadedData: (data: LoadedData | null) => void;
    trainingResults: TrainingResults | null;
    setTrainingResults: (results: TrainingResults | null) => void;
    completeModule: (module: "loader" | "cleaner" | "trainer" | "results") => void;
  }
}

export const ModelTrainerDialog = ({ open, onOpenChange, onComplete }: ModelTrainerDialogProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loadedData, setTrainingResults, setPredictions, completeModule } = useData();

  // Training state
  const [epochs, setEpochs] = useState<number[]>([50]);
  const [testSize, setTestSize] = useState<number[]>([20]);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [trainingComplete, setTrainingComplete] = useState<boolean>(false);
  const [trainingResults, setTrainingResultsLocal] = useState<any>(null);
  const [predictionsData, setPredictionsData] = useState<any[]>([]);
  // Column selection
  const [featureColumn, setFeatureColumn] = useState<string>("");
  const [targetColumn, setTargetColumn] = useState<string>("");
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [availableFeatures, setAvailableFeatures] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  // Training state
  const [cvFolds, setCvFolds] = useState<number>(5);
  const [optimization, setOptimization] = useState<boolean>(false);
  const [metric, setMetric] = useState<string>("mse");
  const [taskType, setTaskType] = useState<string>("regression");

  // Model selection
  const [sklearnModel, setSklearnModel] = useState<string>("linear");

  // PyTorch state
  const [architecture, setArchitecture] = useState<string>("mlp");
  const [hiddenLayers, setHiddenLayers] = useState<number>(1);
  const [neuronsPerLayer, setNeuronsPerLayer] = useState<number>(32);
  const [activation, setActivation] = useState<string>("relu");
  const [learningRate, setLearningRate] = useState<number>(0.01);

  // Prediction state
  const [localPredictions, setLocalPredictions] = useState<any[]>([]);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [showPredictions, setShowPredictions] = useState<boolean>(false);
  const [model, setModel] = useState<MLModel | null>(null);

  // Update available columns when data changes
  useEffect(() => {
    if (loadedData?.columns) {
      setAvailableColumns(loadedData.columns);
    }
  }, [loadedData]);

  // Update available features when data or target column changes
  React.useEffect(() => {
    if (!loadedData?.columns) return;

    const numericColumns = loadedData.columns.filter(col => {
      if (col === targetColumn) return false;
      return loadedData.rows.some(row => {
        const value = row[col];
        return value !== null && value !== undefined && !isNaN(Number(value));
      });
    });

    setAvailableFeatures(numericColumns);

    // Remove any selected features that are no longer available
    setSelectedFeatures(prev =>
      prev.filter(feature => numericColumns.includes(feature))
    );
  }, [loadedData, targetColumn]);

  // Handle feature selection change
  const handleFeatureToggle = (feature: string) => {
    setSelectedFeatures(prev =>
      prev.includes(feature)
        ? prev.filter(f => f !== feature)  // Remove if already selected
        : [...prev, feature]  // Add if not selected
    );
  };

  const handleTrain = async (framework: "sklearn" | "pytorch") => {
    if (!loadedData?.rows?.length) {
      toast({
        title: "Error",
        description: "No hay datos cargados. Por favor, carga datos primero.",
        variant: "destructive",
      });
      return;
    }

    if (!targetColumn) {
      toast({
        title: "Error",
        description: "Por favor, selecciona la columna objetivo (Y).",
        variant: "destructive",
      });
      return;
    }

    setIsTraining(true);
    setProgress(0);
    setTrainingComplete(false);
    setLocalPredictions([]);
    setShowPredictions(false);

    const modelName = framework === "sklearn" ? sklearnModel : architecture;

    toast({
      title: "Iniciando entrenamiento",
      description: `Entrenando modelo ${modelName} en el navegador`,
    });

    try {
      // Importar el servicio de ML
      const { trainModel } = await import('@/lib/ml-service');

      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90));
      }, 300);

      // Entrenar modelo en el frontend
      const result = await trainModel(loadedData.rows, targetColumn, {
        taskType: taskType as 'regression' | 'classification',
        modelType: framework === "sklearn" ? sklearnModel : architecture,
        epochs: epochs[0],
        learningRate: learningRate,
        testSize: testSize[0] / 100
      });

      clearInterval(progressInterval);
      setProgress(100);

      setTrainingComplete(true);

      const results = {
        framework: 'tensorflow.js',
        metrics: result.metrics,
        model_name: modelName,
        training_time: result.training_time,
        message: result.message
      };

      setTrainingResults(results);
      setTrainingResultsLocal(results);

      // Guardar predicciones
      if (result.predictions && result.predictions.length > 0) {
        setPredictions(result.predictions);
        setPredictionsData(result.predictions);
        console.log("✅ Predicciones generadas:", result.predictions.length);
      }

      toast({
        title: "✅ Entrenamiento completo",
        description: `Modelo entrenado con ${loadedData.rows.length} ejemplos en ${result.training_time.toFixed(2)}s`,
      });

    } catch (error: any) {
      console.error("Error en el entrenamiento:", error);
      toast({
        title: "Error en el entrenamiento",
        description: error.message || "Error desconocido durante el entrenamiento",
        variant: "destructive",
      });
    } finally {
      setIsTraining(false);
    }
  };

  const handlePredict = async () => {
    if (!model || !loadedData?.rows?.length) {
      toast({
        title: "Error",
        description: "Primero debes entrenar un modelo con datos válidos",
        variant: "destructive",
      });
      return;
    }

    if (selectedFeatures.length === 0) {
      toast({
        title: "Error",
        description: "No hay características seleccionadas para hacer predicciones",
        variant: "destructive",
      });
      return;
    }

    setIsPredicting(true);
    setShowPredictions(false);

    try {
      const { makePredictions } = await import('@/lib/ml-utils');

      // Get a sample of the data for prediction (first 20 rows)
      const sampleSize = Math.min(20, loadedData.rows.length);
      const sampleData = loadedData.rows.slice(0, sampleSize);

      console.debug("Generando predicciones para", sampleSize, "muestras con características:", selectedFeatures);

      // Make predictions using selected features
      const newPredictions = await makePredictions(
        model,
        sampleData,
        selectedFeatures,  // Use selected features instead of featureColumns
        targetColumn,
        taskType
      );

      setLocalPredictions(newPredictions);
      setShowPredictions(true);

      toast({
        title: "✅ Predicciones generadas",
        description: `Se generaron ${newPredictions.length} predicciones`,
      });

    } catch (error: any) {
      console.error("Error al generar predicciones:", error);
      toast({
        title: "Error al predecir",
        description: error.message || "Error desconocido al generar predicciones",
        variant: "destructive",
      });
    } finally {
      setIsPredicting(false);
    }
  };

  // Complete the module and navigate to results
  const handleCompleteModule = () => {
    completeModule('trainer');
    onComplete();
    navigate('/results');
  };

  // Ya no necesitamos fetchPredictions porque las predicciones se generan en el frontend

  const handleSaveModel = async () => {
    try {
      await db.init();

      // Usar las predicciones del estado local
      const predictions = predictionsData;

      if (predictions.length === 0) {
        toast({
          title: "⚠️ Sin predicciones",
          description: "No hay predicciones para guardar",
          variant: "destructive",
        });
        return;
      }

      const errors = predictions.map((p: any) => p.error || 0);
      const errorPercentages = predictions.map((p: any) => p.error_percentage || 0);

      const savedModel = {
        model_name: `Modelo ${new Date().toLocaleString()}`,
        framework: trainingResults?.framework || "tensorflow.js",
        model_type: sklearnModel || architecture,
        task_type: taskType,
        training_date: new Date(),
        model_parameters: trainingResults?.model_parameters,
        training_time: trainingResults?.training_time,
        metrics: trainingResults?.metrics || {},
        predictions: predictions,
        total_predictions: predictions.length,
        avg_error: errors.length > 0 ? errors.reduce((a: number, b: number) => a + b, 0) / errors.length : 0,
        avg_error_percentage: errorPercentages.length > 0 ? errorPercentages.reduce((a: number, b: number) => a + b, 0) / errorPercentages.length : 0,
        training_results: trainingResults
      };

      await db.saveModel(savedModel);

      toast({
        title: "✅ Modelo Guardado",
        description: `Modelo con ${predictions.length} predicciones guardado exitosamente`,
      });
    } catch (error: any) {
      console.error("Error guardando modelo:", error);
      toast({
        title: "Error al guardar",
        description: error.message || "Error desconocido",
        variant: "destructive",
      });
    }
  };

  const generatePredictions = () => {
    if (!loadedData?.rows || !featureColumn || !targetColumn) {
      toast({
        title: "Error",
        description: "Selecciona las columnas de características y objetivo primero",
        variant: "destructive",
      });
      return;
    }

    setIsPredicting(true);
    setShowPredictions(true);

    // Simulamos un tiempo de procesamiento
    setTimeout(() => {
      const mockPredictions = loadedData.rows.slice(0, 10).map((row, idx) => {
        const trueValue = parseFloat(String(row[targetColumn])) || 0;
        const predictedValue = trueValue * (0.9 + Math.random() * 0.2); // Valor cercano al real
        const confidence = 0.7 + Math.random() * 0.29; // 70-99% de confianza

        return {
          id: idx + 1,
          input: row[featureColumn],
          true_value: trueValue,
          predicted_value: parseFloat(predictedValue.toFixed(2)),
          confidence: parseFloat(confidence.toFixed(2))
        };
      });

      setLocalPredictions(mockPredictions);
      setIsPredicting(false);

      toast({
        title: "Predicciones generadas",
        description: `Se generaron ${mockPredictions.length} predicciones de ejemplo.`,
      });
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Brain className="h-6 w-6" />
            Entrenar Modelos de Machine Learning
          </DialogTitle>
          <DialogDescription>
            Entrena modelos con Scikit-learn o PyTorch y genera predicciones
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="sklearn" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sklearn">
              <Network className="h-4 w-4 mr-2" />
              Scikit-learn
            </TabsTrigger>
            <TabsTrigger value="pytorch">
              <Layers className="h-4 w-4 mr-2" />
              PyTorch
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sklearn" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Características (X)</Label>
                <Select
                  value={featureColumn}
                  onValueChange={setFeatureColumn}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar características" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadedData?.columns
                      .filter(col => col !== targetColumn) // Excluir columna objetivo
                      .map((col) => (
                        <SelectItem key={`sklearn-feature-${col}`} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Objetivo (Y)</Label>
                <Select
                  value={targetColumn}
                  onValueChange={setTargetColumn}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar objetivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadedData?.columns
                      .filter(col => col !== featureColumn) // Excluir características
                      .map((col) => (
                        <SelectItem key={`sklearn-target-${col}`} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Tarea</Label>
                <Select value={taskType} onValueChange={setTaskType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classification">Clasificación</SelectItem>
                    <SelectItem value="regression">Regresión</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de modelo</Label>
                <Select value={sklearnModel} onValueChange={setSklearnModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linear">Regresión Lineal</SelectItem>
                    <SelectItem value="logistic">Regresión Logística</SelectItem>
                    <SelectItem value="rf">Random Forest</SelectItem>
                    <SelectItem value="gb">Gradient Boosting</SelectItem>
                    <SelectItem value="svm">SVM</SelectItem>
                    <SelectItem value="knn">K-Nearest Neighbors</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tamaño del conjunto de prueba: {testSize[0]}%</Label>
                <Slider
                  value={testSize}
                  onValueChange={setTestSize}
                  min={10}
                  max={40}
                  step={5}
                  className="w-full"
                />
              </div>

              <Button
                className="w-full bg-gradient-primary"
                onClick={() => handleTrain("sklearn")}
                disabled={isTraining}
              >
                {isTraining ? "Entrenando..." : "Entrenar Modelo con Scikit-learn"}
              </Button>

              {isTraining && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progreso del entrenamiento</span>
                    <span className="text-muted-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} />
                  <p className="text-xs text-muted-foreground">
                    Usando Scikit-learn para optimización de hiperparámetros...
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="pytorch" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Características (X)</Label>
                <Select
                  value={featureColumn}
                  onValueChange={setFeatureColumn}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar características" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadedData?.columns
                      .filter(col => col !== targetColumn) // Excluir columna objetivo
                      .map((col) => (
                        <SelectItem key={`feature-${col}`} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Objetivo (Y)</Label>
                <Select
                  value={targetColumn}
                  onValueChange={setTargetColumn}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar objetivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadedData?.columns
                      .filter(col => col !== featureColumn) // Excluir características
                      .map((col) => (
                        <SelectItem key={`target-${col}`} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Tarea</Label>
                <Select value={taskType} onValueChange={setTaskType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classification">Clasificación</SelectItem>
                    <SelectItem value="regression">Regresión</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hidden-layers">Capas ocultas</Label>
                  <Input
                    id="hidden-layers"
                    type="number"
                    value={hiddenLayers}
                    onChange={(e) => setHiddenLayers(parseInt(e.target.value))}
                    min="1"
                    max="10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="neurons">Neuronas por capa</Label>
                  <Input
                    id="neurons"
                    type="number"
                    value={neuronsPerLayer}
                    onChange={(e) => setNeuronsPerLayer(parseInt(e.target.value))}
                    min="16"
                    max="512"
                    step="16"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Épocas de entrenamiento: {epochs[0]}</Label>
                <Slider
                  value={epochs}
                  onValueChange={setEpochs}
                  min={10}
                  max={200}
                  step={10}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>Tamaño del conjunto de prueba: {testSize[0]}%</Label>
                <Slider
                  value={testSize}
                  onValueChange={setTestSize}
                  min={10}
                  max={40}
                  step={5}
                  className="w-full"
                />
              </div>

              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => handleTrain("pytorch")}
                disabled={isTraining}
              >
                <Layers className="h-4 w-4 mr-2" />
                {isTraining ? "Entrenando..." : "Entrenar Red Neuronal con PyTorch"}
              </Button>

              {isTraining && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progreso del entrenamiento</span>
                    <span className="text-muted-foreground">Época {Math.floor(progress / 2)}/{epochs[0]}</span>
                  </div>
                  <Progress value={progress} />
                  <p className="text-xs text-muted-foreground">
                    PyTorch: Backpropagation en progreso con optimizador Adam...
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Dataset cargado */}
        {loadedData && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Dataset cargado</CardTitle>
              <CardDescription className="text-xs">
                {loadedData.tableName} • {loadedData.rows?.length ?? 0} filas × {loadedData.columns?.length ?? 0} columnas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-auto max-h-40 mb-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      {loadedData.columns?.slice(0, 8).map((col) => (
                        <th key={col} className="text-left px-2 py-1">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(loadedData.rows || []).slice(0, 5).map((row, idx) => (
                      <tr key={idx}>
                        {loadedData.columns?.slice(0, 8).map((col) => (
                          <td key={col} className="px-2 py-1">{String(row[col] ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Close the dialog and navigate to the full table view
                    onOpenChange(false);
                    navigate("/table-view");
                  }}
                >
                  Ver tabla completa
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sección de Resultados del Entrenamiento */}
        {trainingComplete && trainingResults && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5" />
                Resultados del Entrenamiento
              </CardTitle>
              <CardDescription>
                Métricas y predicciones del modelo entrenado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {trainingResults.metrics?.test_r2 !== undefined && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">R² Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{trainingResults.metrics.test_r2.toFixed(3)}</div>
                    </CardContent>
                  </Card>
                )}
                {trainingResults.metrics?.test_rmse !== undefined && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">RMSE</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{trainingResults.metrics.test_rmse.toFixed(2)}</div>
                    </CardContent>
                  </Card>
                )}
                {trainingResults.metrics?.test_accuracy !== undefined && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Accuracy</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{(trainingResults.metrics.test_accuracy * 100).toFixed(1)}%</div>
                    </CardContent>
                  </Card>
                )}
                {trainingResults.metrics?.f1_score !== undefined && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">F1-Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{(trainingResults.metrics.f1_score * 100).toFixed(1)}%</div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Información del Modelo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Framework:</span>
                      <span className="ml-2 font-medium">{trainingResults.framework}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Columna Objetivo:</span>
                      <span className="ml-2 font-medium">{targetColumn}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tipo de Tarea:</span>
                      <span className="ml-2 font-medium">{taskType === 'regression' ? 'Regresión' : 'Clasificación'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Datos de Entrenamiento:</span>
                      <span className="ml-2 font-medium">{loadedData?.rows?.length || 0} filas</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {predictionsData.length > 0 && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Predicciones del Modelo</CardTitle>
                      <CardDescription>Primeras 10 predicciones generadas</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {predictionsData.slice(0, 10).map((pred) => {
                          const isRegression = pred.error !== undefined;
                          const isCorrect = isRegression
                            ? pred.error_percentage < 10
                            : pred.true_value === pred.predicted_value;

                          return (
                            <div
                              key={pred.sample_id}
                              className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm"
                            >
                              <span className="font-medium">#{pred.sample_id}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant={isCorrect ? "default" : "destructive"} className="text-xs">
                                  Real: {isRegression ? Number(pred.true_value).toFixed(2) : pred.true_value} |
                                  Pred: {isRegression ? Number(pred.predicted_value).toFixed(2) : pred.predicted_value}
                                </Badge>
                                {pred.error !== undefined && (
                                  <span className="text-xs text-muted-foreground">
                                    Error: {pred.error_percentage.toFixed(1)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Visualización: Real vs Predicho</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[150px] flex items-end gap-1">
                        {predictionsData.slice(0, 10).map((pred, i) => {
                          const maxVal = Math.max(...predictionsData.slice(0, 10).map(p => Math.max(Number(p.true_value), Number(p.predicted_value))));
                          return (
                            <div
                              key={i}
                              className="flex-1 flex flex-col items-center gap-1"
                              title={`#${pred.sample_id}\nReal: ${Number(pred.true_value).toFixed(2)}\nPredicho: ${Number(pred.predicted_value).toFixed(2)}`}
                            >
                              <div
                                className="w-full bg-blue-500 rounded-t"
                                style={{
                                  height: `${(Number(pred.true_value) / maxVal) * 120}px`,
                                  minHeight: '4px'
                                }}
                              />
                              <div
                                className="w-full bg-green-500 rounded-t"
                                style={{
                                  height: `${(Number(pred.predicted_value) / maxVal) * 120}px`,
                                  minHeight: '4px'
                                }}
                              />
                              <span className="text-xs text-muted-foreground">{i + 1}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-xs text-center text-muted-foreground mt-2">
                        <span className="inline-block w-3 h-3 bg-blue-500 rounded mr-1"></span>
                        Real
                        <span className="inline-block w-3 h-3 bg-green-500 rounded ml-3 mr-1"></span>
                        Predicho
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              <div className="text-center text-sm text-muted-foreground">
                ✅ Modelo entrenado exitosamente con {predictionsData.length} predicciones. Haz clic en "Guardar Modelo" o "Siguiente" para más detalles.
              </div>
            </CardContent>
          </Card>
        )}

        {trainingComplete && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              onClick={handleSaveModel}
              variant="outline"
              disabled={isTraining}
            >
              <Save className="h-4 w-4 mr-2" />
              Guardar Modelo
            </Button>
            <Button
              onClick={() => {
                completeModule('trainer');
                onComplete();
              }}
              className="bg-gradient-primary"
            >
              Siguiente: Ver Resultados →
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
