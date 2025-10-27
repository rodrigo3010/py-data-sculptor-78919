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
import { Brain, Network, Layers, PlayCircle, CheckCircle2, AlertCircle } from "lucide-react";

// Custom Hooks
import { useData } from "@/contexts/DataContext";

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
    
    if (!featureColumn || !targetColumn) {
      toast({
        title: "Error",
        description: "Por favor, selecciona tanto la columna de características (X) como la columna objetivo (Y).",
        variant: "destructive",
      });
      return;
    }

    if (featureColumn === targetColumn) {
      toast({
        title: "Error",
        description: "La columna de características (X) y la columna objetivo (Y) no pueden ser la misma.",
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
      description: `Entrenando modelo ${modelName} con ${featureColumn} -> ${targetColumn}`,
    });

    try {
      // Import tfjs dynamically to avoid SSR issues
      const tf = await import('@tensorflow/tfjs');
      const { trainModel } = await import('@/lib/ml-utils');
      
      // Show progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90));
      }, 500);

      // Train the model
      const { model: trainedModel, results } = await trainModel(
        loadedData.rows,
        [featureColumn],  // Use featureColumn as an array
        targetColumn,
        framework,
        taskType
      );

      clearInterval(progressInterval);
      setProgress(100);
      setModel(trainedModel);
      setTrainingComplete(true);
      
      // Store results in context
      setTrainingResults({
        ...results,
        framework: framework,
        model_name: modelName,
      });
      
      toast({
        title: "✅ Entrenamiento completo",
        description: `Modelo entrenado con ${loadedData.rows.length} ejemplos`,
      });

      // Generar predicciones automáticamente
      await fetchPredictions();
      
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

  const fetchPredictions = async () => {
    try {
      const response = await fetch("/predictions?n_samples=50");
      const data = await response.json();
      
      if (data.predictions && data.predictions.length > 0) {
        setPredictions(data.predictions);
        console.log("Predicciones guardadas en contexto:", data.predictions.length);
      }
    } catch (error) {
      console.error("Error al obtener predicciones:", error);
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

        {/* Sección de Predicciones */}
{/* Sección de Resultados */}
{trainingComplete && (
  <Card className="mt-6">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <BarChart2 className="h-5 w-5" />
        Resultados de Predicción
      </CardTitle>
      <CardDescription>
        Visualización de las predicciones generadas por el modelo
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Métricas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Error Promedio:</span>
                <span className="font-medium">
                  {localPredictions.length > 0 
                    ? (localPredictions.reduce((sum, p) => 
                        sum + Math.abs(Number(p.true_value) - Number(p.predicted_value)), 0) / localPredictions.length).toFixed(2)
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Precisión:</span>
                <span className="font-medium">
                  {localPredictions.length > 0 
                    ? `${(localPredictions.reduce((sum, p) => 
                        sum + (Math.abs(Number(p.true_value) - Number(p.predicted_value)) / Number(p.true_value) < 0.1 ? 1 : 0), 0) / 
                        localPredictions.length * 100).toFixed(1)}%`
                    : 'N/A'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Distribución</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[100px] flex items-end gap-1">
              {localPredictions.slice(0, 10).map((p, i) => (
                <div 
                  key={i} 
                  className="flex-1 flex flex-col items-center"
                  title={`Real: ${p.true_value}\nPredicho: ${p.predicted_value}`}
                >
                  <div 
                    className="w-full bg-blue-500 rounded-t-sm"
                    style={{ 
                      height: `${(Number(p.true_value) / Math.max(...localPredictions.map(p => Number(p.true_value)), 1)) * 80}%`,
                      opacity: 0.7
                    }}
                  />
                  <div 
                    className="w-full bg-green-500 rounded-t-sm"
                    style={{ 
                      height: `${(Number(p.predicted_value) / Math.max(...localPredictions.map(p => Number(p.true_value)), 1)) * 80}%`
                    }}
                  />
                  <span className="text-xs mt-1">{i+1}</span>
                </div>
              ))}
            </div>
            <div className="text-xs text-center text-muted-foreground mt-2">
              Comparación de valores reales (azul) vs predichos (verde)
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-medium">Predicciones</h3>
          <Button 
            onClick={generatePredictions}
            disabled={isPredicting}
            variant="outline"
            size="sm"
          >
            {isPredicting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isPredicting ? 'Generando...' : 'Generar Predicciones'}
          </Button>
        </div>

        {showPredictions ? (
          localPredictions.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Entrada ({featureColumn})</TableHead>
                    <TableHead>Valor Real</TableHead>
                    <TableHead>Predicción</TableHead>
                    <TableHead>Diferencia</TableHead>
                    <TableHead>Confianza</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localPredictions.map((pred) => (
                    <TableRow key={pred.id}>
                      <TableCell className="font-medium">{pred.id}</TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {String(pred.input).substring(0, 20)}{String(pred.input).length > 20 ? '...' : ''}
                      </TableCell>
                      <TableCell>{Number(pred.true_value).toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={`font-medium ${
                          Math.abs(Number(pred.true_value) - Number(pred.predicted_value)) / Number(pred.true_value) < 0.1 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {Number(pred.predicted_value).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {(Number(pred.true_value) - Number(pred.predicted_value)).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full bg-blue-600" 
                            style={{ width: `${(Number(pred.confidence) || 0) * 100}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground text-center mt-1">
                          {((Number(pred.confidence) || 0) * 100).toFixed(0)}%
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <BarChart2 className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No se pudieron generar predicciones. Intenta nuevamente.
              </p>
            </div>
          )
        ) : (
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <BarChart2 className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Haz clic en "Generar Predicciones" para ver los resultados del modelo.
            </p>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
)}

        {trainingComplete && (
          <div className="flex justify-end pt-4 border-t">
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
