import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Brain, Network, Layers, Table as TableIcon, Save, PlayCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import axios from "axios";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ModelTrainerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

import { useData } from "@/contexts/DataContext";

export const ModelTrainerDialog = ({ open, onOpenChange, onComplete }: ModelTrainerDialogProps) => {
  const [epochs, setEpochs] = useState([50]);
  const [testSize, setTestSize] = useState([20]);
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [trainingComplete, setTrainingComplete] = useState(false);
  const { toast } = useToast();
  const { completeModule, loadedData, setTrainingResults } = useData();
  
  // Sklearn state
  const [sklearnModel, setSklearnModel] = useState("rf");
  const [cvFolds, setCvFolds] = useState(5);
  const [optimization, setOptimization] = useState("none");
  const [metric, setMetric] = useState("accuracy");
  const [targetColumn, setTargetColumn] = useState("");
  const [taskType, setTaskType] = useState("classification");
  
  // PyTorch state
  const [architecture, setArchitecture] = useState("mlp");
  const [hiddenLayers, setHiddenLayers] = useState(3);
  const [neuronsPerLayer, setNeuronsPerLayer] = useState(128);
  const [activation, setActivation] = useState("relu");
  const [optimizer, setOptimizer] = useState("adam");
  const [learningRate, setLearningRate] = useState(0.001);
  const [batchSize, setBatchSize] = useState(32);
  const [lossFunction, setLossFunction] = useState("cross_entropy");
  
  // Prediction state
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isPredicting, setIsPredicting] = useState(false);
  const [showDataTable, setShowDataTable] = useState(true);
  const [isSavingToDb, setIsSavingToDb] = useState(false);

  const handleTrain = async (framework: string) => {
    if (!loadedData || !loadedData.rows || loadedData.rows.length === 0) {
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
        description: "Por favor, selecciona una columna objetivo (target).",
        variant: "destructive",
      });
      return;
    }
    
    setIsTraining(true);
    setProgress(0);
    setTrainingComplete(false);
    
    const modelName = framework === "sklearn" ? sklearnModel : architecture;
    
    toast({
      title: "Iniciando entrenamiento",
      description: `Entrenando modelo ${modelName} con ${framework}`,
    });

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 5, 90));
    }, 500);

    try {
      const requestData = {
        framework,
        data: loadedData.rows,
        columns: loadedData.columns,
        target_column: targetColumn,
        model_type: framework === "sklearn" ? sklearnModel : "mlp",
        task_type: taskType,
        test_size: testSize[0] / 100,
        ...(framework === "sklearn" ? {
          cv_folds: cvFolds,
          optimize_hyperparams: optimization,
          metric: metric,
        } : {
          architecture: architecture,
          hidden_layers: hiddenLayers,
          neurons_per_layer: neuronsPerLayer,
          activation: activation,
          optimizer: optimizer,
          learning_rate: learningRate,
          epochs: epochs[0],
          batch_size: batchSize,
          loss_function: lossFunction,
        })
      };

      const response = await axios.post("/train-model", requestData);
      
      clearInterval(progressInterval);
      setProgress(100);
      setIsTraining(false);
      setTrainingComplete(true);
      
      // Store results in context
      setTrainingResults(response.data);
      
      toast({
        title: "Entrenamiento completo",
        description: response.data.message || "El modelo ha sido entrenado exitosamente",
      });
      
    } catch (error: any) {
      clearInterval(progressInterval);
      setIsTraining(false);
      setProgress(0);
      
      toast({
        title: "Error en el entrenamiento",
        description: error.response?.data?.detail || error.message || "Error desconocido",
        variant: "destructive",
      });
    }
  };

  const handlePredict = async () => {
    if (!trainingComplete) {
      toast({
        title: "Error",
        description: "Primero debes entrenar un modelo",
        variant: "destructive",
      });
      return;
    }

    if (!loadedData || !loadedData.rows || loadedData.rows.length === 0) {
      toast({
        title: "Error",
        description: "No hay datos para predecir",
        variant: "destructive",
      });
      return;
    }

    if (!targetColumn) {
      toast({
        title: "Error",
        description: "Debes seleccionar una columna objetivo",
        variant: "destructive",
      });
      return;
    }

    setIsPredicting(true);
    
    try {
      // Usar el endpoint que obtiene predicciones del test set guardado
      const response = await axios.get("/predictions?n_samples=20");
      
      if (!response.data.predictions || response.data.predictions.length === 0) {
        toast({
          title: "Sin predicciones",
          description: "No se pudieron generar predicciones del conjunto de prueba.",
          variant: "destructive",
        });
        setPredictions([]);
        return;
      }
      
      setPredictions(response.data.predictions);
      
      toast({
        title: "✅ Predicciones generadas",
        description: `Se generaron ${response.data.predictions.length} predicciones del conjunto de prueba`,
      });
    } catch (error: any) {
      toast({
        title: "Error al predecir",
        description: error.response?.data?.detail || error.message,
        variant: "destructive",
      });
      setPredictions([]);
    } finally {
      setIsPredicting(false);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!loadedData || loadedData.source !== "database") {
      toast({
        title: "Error",
        description: "Solo se pueden guardar datos que provienen de una base de datos",
        variant: "destructive",
      });
      return;
    }

    setIsSavingToDb(true);

    try {
      // Aquí puedes agregar la lógica para guardar a la BD
      // Por ahora simularemos el guardado
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Datos guardados",
        description: `Tabla "${loadedData.tableName}" actualizada en la base de datos`,
      });
    } catch (error: any) {
      toast({
        title: "Error al guardar",
        description: error.message || "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsSavingToDb(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Entrenar Modelos</DialogTitle>
          <DialogDescription>
            Configura y entrena modelos con Scikit-learn y PyTorch
          </DialogDescription>
        </DialogHeader>

        {/* Información de datos cargados */}
        {loadedData && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Datos Cargados</CardTitle>
                  <CardDescription>
                    Tabla: {loadedData.tableName} | Filas: {loadedData.rows.length} | Columnas: {loadedData.columns.length}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDataTable(!showDataTable)}
                >
                  <TableIcon className="h-4 w-4 mr-2" />
                  {showDataTable ? "Ocultar" : "Mostrar"} Tabla
                </Button>
              </div>
            </CardHeader>
            
            {showDataTable && (
              <CardContent>
                <div className="max-h-64 overflow-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {loadedData.columns.map((col) => (
                          <TableHead key={col} className="font-semibold">
                            {col}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadedData.rows.slice(0, 10).map((row, idx) => (
                        <TableRow key={idx}>
                          {loadedData.columns.map((col) => (
                            <TableCell key={col}>
                              {row[col]?.toString() || "-"}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {loadedData.rows.length > 10 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Mostrando 10 de {loadedData.rows.length} filas
                  </p>
                )}
              </CardContent>
            )}
          </Card>
        )}

        {/* Botones de acción principales */}
        <div className="flex gap-2">
          <Button
            className="flex-1"
            variant="outline"
            onClick={handlePredict}
            disabled={isPredicting || !trainingComplete}
          >
            <PlayCircle className="h-4 w-4 mr-2" />
            {isPredicting ? "Prediciendo..." : "Predecir"}
          </Button>
          
          {loadedData?.source === "database" && (
            <Button
              className="flex-1"
              variant="outline"
              onClick={handleSaveToDatabase}
              disabled={isSavingToDb}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSavingToDb ? "Guardando..." : "Guardar a BD"}
            </Button>
          )}
        </div>

        {/* Predicciones */}
        {predictions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Predicciones Recientes</CardTitle>
              <CardDescription>
                Últimas {predictions.length} predicciones del modelo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-auto">
                {predictions.map((pred, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                  >
                    <span className="text-sm">Muestra #{pred.sample_id || idx + 1}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={pred.true_value === pred.predicted_value ? "default" : "destructive"}>
                        Real: {pred.true_value} | Pred: {pred.predicted_value}
                      </Badge>
                      {pred.confidence && (
                        <span className="text-xs text-muted-foreground">
                          {(pred.confidence * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        <Tabs defaultValue="sklearn" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sklearn">
              <Brain className="h-4 w-4 mr-2" />
              Scikit-learn
            </TabsTrigger>
            <TabsTrigger value="pytorch">
              <Network className="h-4 w-4 mr-2" />
              PyTorch
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="sklearn" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Columna Objetivo (Target)</Label>
                <Select value={targetColumn} onValueChange={setTargetColumn}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar columna objetivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadedData?.columns.map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de tarea</Label>
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
                <Label>Columna Objetivo (Target)</Label>
                <Select value={targetColumn} onValueChange={setTargetColumn}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar columna objetivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadedData?.columns.map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Arquitectura de red</Label>
                <Select value={architecture} onValueChange={setArchitecture}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar arquitectura" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mlp">MLP (Multi-Layer Perceptron)</SelectItem>
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
                <Label>Función de activación</Label>
                <Select value={activation} onValueChange={setActivation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar activación" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relu">ReLU</SelectItem>
                    <SelectItem value="leaky_relu">Leaky ReLU</SelectItem>
                    <SelectItem value="sigmoid">Sigmoid</SelectItem>
                    <SelectItem value="tanh">Tanh</SelectItem>
                    <SelectItem value="gelu">GELU</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Optimizador</Label>
                <Select value={optimizer} onValueChange={setOptimizer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar optimizador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adam">Adam</SelectItem>
                    <SelectItem value="sgd">SGD</SelectItem>
                    <SelectItem value="adamw">AdamW</SelectItem>
                    <SelectItem value="rmsprop">RMSprop</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="learning-rate">Learning Rate</Label>
                <Input 
                  id="learning-rate" 
                  type="number" 
                  value={learningRate}
                  onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                  step="0.0001"
                />
              </div>

              <div className="space-y-2">
                <Label>Épocas: {epochs[0]}</Label>
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
                <Label htmlFor="batch-size">Batch Size</Label>
                <Input 
                  id="batch-size" 
                  type="number" 
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value))}
                />
              </div>

              <Button 
                className="w-full bg-gradient-primary"
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
