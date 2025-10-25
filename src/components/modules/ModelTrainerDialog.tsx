import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Brain, Network, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import axios from "axios";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Entrenar Modelos</DialogTitle>
          <DialogDescription>
            Configura y entrena modelos con Scikit-learn y PyTorch
          </DialogDescription>
        </DialogHeader>
        
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

              <div className="space-y-2">
                <Label>División Train/Test: {testSize[0]}%</Label>
                <Slider
                  value={testSize}
                  onValueChange={setTestSize}
                  min={10}
                  max={40}
                  step={5}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cv-folds">Cross-Validation Folds</Label>
                <Input 
                  id="cv-folds" 
                  type="number" 
                  value={cvFolds}
                  onChange={(e) => setCvFolds(parseInt(e.target.value))}
                  min="2"
                  max="10"
                />
              </div>

              <div className="space-y-2">
                <Label>Optimización de hiperparámetros</Label>
                <Select value={optimization} onValueChange={setOptimization}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin optimización</SelectItem>
                    <SelectItem value="grid">Grid Search</SelectItem>
                    <SelectItem value="random">Random Search</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Métrica de evaluación</Label>
                <Select value={metric} onValueChange={setMetric}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar métrica" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accuracy">Accuracy</SelectItem>
                    <SelectItem value="precision">Precision</SelectItem>
                    <SelectItem value="recall">Recall</SelectItem>
                    <SelectItem value="f1">F1-Score</SelectItem>
                    <SelectItem value="auc">AUC-ROC</SelectItem>
                    <SelectItem value="mse">MSE</SelectItem>
                    <SelectItem value="r2">R² Score</SelectItem>
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

              <div className="space-y-2">
                <Label>Loss Function</Label>
                <Select value={lossFunction} onValueChange={setLossFunction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar función de pérdida" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mse">MSE Loss</SelectItem>
                    <SelectItem value="cross_entropy">Cross Entropy</SelectItem>
                    <SelectItem value="bce">Binary Cross Entropy</SelectItem>
                    <SelectItem value="mae">MAE Loss</SelectItem>
                  </SelectContent>
                </Select>
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
