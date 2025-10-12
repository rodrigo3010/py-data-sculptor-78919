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

interface ModelTrainerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ModelTrainerDialog = ({ open, onOpenChange }: ModelTrainerDialogProps) => {
  const [epochs, setEpochs] = useState([50]);
  const [testSize, setTestSize] = useState([20]);
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleTrain = (framework: string, model: string) => {
    setIsTraining(true);
    setProgress(0);
    
    toast({
      title: "Iniciando entrenamiento",
      description: `Entrenando modelo ${model} con ${framework}`,
    });

    // Simular progreso de entrenamiento
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsTraining(false);
          toast({
            title: "Entrenamiento completo",
            description: "El modelo ha sido entrenado exitosamente",
          });
          return 100;
        }
        return prev + 2;
      });
    }, 100);
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
                <Label>Tipo de modelo</Label>
                <Select>
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
                  defaultValue="5"
                  min="2"
                  max="10"
                />
              </div>

              <div className="space-y-2">
                <Label>Optimización de hiperparámetros</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin optimización</SelectItem>
                    <SelectItem value="grid">Grid Search</SelectItem>
                    <SelectItem value="random">Random Search</SelectItem>
                    <SelectItem value="bayesian">Bayesian Optimization</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Métrica de evaluación</Label>
                <Select>
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
                onClick={() => handleTrain("Scikit-learn", "modelo seleccionado")}
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
                <Label>Arquitectura de red</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar arquitectura" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mlp">MLP (Multi-Layer Perceptron)</SelectItem>
                    <SelectItem value="cnn">CNN (Convolutional Neural Network)</SelectItem>
                    <SelectItem value="rnn">RNN (Recurrent Neural Network)</SelectItem>
                    <SelectItem value="lstm">LSTM</SelectItem>
                    <SelectItem value="transformer">Transformer</SelectItem>
                    <SelectItem value="custom">Arquitectura personalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hidden-layers">Capas ocultas</Label>
                  <Input 
                    id="hidden-layers" 
                    type="number" 
                    defaultValue="3"
                    min="1"
                    max="10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="neurons">Neuronas por capa</Label>
                  <Input 
                    id="neurons" 
                    type="number" 
                    defaultValue="128"
                    min="16"
                    max="512"
                    step="16"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Función de activación</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar activación" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relu">ReLU</SelectItem>
                    <SelectItem value="leaky-relu">Leaky ReLU</SelectItem>
                    <SelectItem value="sigmoid">Sigmoid</SelectItem>
                    <SelectItem value="tanh">Tanh</SelectItem>
                    <SelectItem value="gelu">GELU</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Optimizador</Label>
                <Select>
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
                  defaultValue="0.001"
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
                  defaultValue="32"
                />
              </div>

              <div className="space-y-2">
                <Label>Loss Function</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar función de pérdida" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mse">MSE Loss</SelectItem>
                    <SelectItem value="cross-entropy">Cross Entropy</SelectItem>
                    <SelectItem value="bce">Binary Cross Entropy</SelectItem>
                    <SelectItem value="mae">MAE Loss</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                className="w-full bg-gradient-primary"
                onClick={() => handleTrain("PyTorch", "red neuronal")}
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
      </DialogContent>
    </Dialog>
  );
};
