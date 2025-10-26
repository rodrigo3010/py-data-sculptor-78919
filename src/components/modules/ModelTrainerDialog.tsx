import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Brain, Network, Layers, PlayCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useData } from "@/contexts/DataContext";

interface ModelTrainerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export const ModelTrainerDialog = ({ open, onOpenChange, onComplete }: ModelTrainerDialogProps) => {
  const [epochs, setEpochs] = useState([50]);
  const [testSize, setTestSize] = useState([20]);
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [trainingComplete, setTrainingComplete] = useState(false);
  const { toast } = useToast();
  const { completeModule, loadedData, setTrainingResults } = useData();
  const navigate = useNavigate();
  
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
  const [showPredictions, setShowPredictions] = useState(false);
  const [currentFramework, setCurrentFramework] = useState<string>("");

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
    setPredictions([]);
    setShowPredictions(false);
    setCurrentFramework(framework);
    
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
        title: "✅ Entrenamiento completo",
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

    setIsPredicting(true);
    setShowPredictions(false);

    try {
      console.debug("[ModelTrainerDialog] Solicitud de predicciones iniciada...");
      const response = await axios.get("/predictions?n_samples=20");
      console.debug("[ModelTrainerDialog] Respuesta /predictions:", response.status, response.data);

      // Defensive checks and improved diagnostics
      if (!response || !response.data || !response.data.predictions || response.data.predictions.length === 0) {
        console.debug("[ModelTrainerDialog] No se encontraron predicciones en la respuesta:", response?.data);
        const serverMessage = response?.data?.message || response?.data?.detail;
        toast({
          title: "Sin predicciones",
          description: serverMessage
            ? `Servidor: ${serverMessage}`
            : "No se pudieron generar predicciones del conjunto de prueba. Verifica que el modelo esté entrenado y que el backend esté disponible.",
          variant: "destructive",
        });
        setPredictions([]);
        setIsPredicting(false);
        return;
      }

      setPredictions(response.data.predictions);
      setShowPredictions(true);
      setIsPredicting(false);

      toast({
        title: "✅ Predicciones generadas",
        description: `Se generaron ${response.data.predictions.length} predicciones del conjunto de prueba`,
      });
    } catch (error: any) {
      // Log full error for debugging
      console.error("[ModelTrainerDialog] Error al solicitar predicciones:", error);
      setIsPredicting(false);

      // Try to extract useful server-side details
      const serverDetail = error?.response?.data?.detail || error?.response?.data?.message || error?.response?.data || null;
      const description = serverDetail
        ? `Error del servidor: ${typeof serverDetail === "string" ? serverDetail : JSON.stringify(serverDetail)}`
        : error?.message || "Error al generar predicciones. Revisa los logs del servidor y que exista un modelo entrenado.";

      toast({
        title: "Error al predecir",
        description,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
        {trainingComplete && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5" />
                Generar Predicciones
              </CardTitle>
              <CardDescription>
                Genera predicciones del conjunto de prueba con el modelo entrenado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handlePredict}
                disabled={isPredicting}
                className="w-full"
                variant="outline"
              >
                {isPredicting ? "Generando predicciones..." : "Generar Predicciones del Test Set"}
              </Button>

              {showPredictions && predictions.length > 0 && (
                <div className="space-y-3">
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      Se generaron {predictions.length} predicciones del conjunto de prueba
                    </AlertDescription>
                  </Alert>

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">ID</TableHead>
                          <TableHead>Valor Real</TableHead>
                          <TableHead>Predicción</TableHead>
                          <TableHead>Estado</TableHead>
                          {predictions[0]?.confidence && (
                            <TableHead>Confianza</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {predictions.map((pred, idx) => {
                          const isCorrect = pred.true_value === pred.predicted_value;
                          return (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{pred.sample_id}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{pred.true_value}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={isCorrect ? "default" : "destructive"}>
                                  {pred.predicted_value}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {isCorrect ? (
                                  <Badge variant="default" className="bg-green-500">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Correcto
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Incorrecto
                                  </Badge>
                                )}
                              </TableCell>
                              {pred.confidence && (
                                <TableCell>
                                  <Badge variant="secondary">
                                    {(pred.confidence * 100).toFixed(1)}%
                                  </Badge>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
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
