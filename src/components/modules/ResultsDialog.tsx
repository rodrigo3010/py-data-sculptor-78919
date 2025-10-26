import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, LineChart, TrendingUp, Download, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart as RechartsLine, Line, BarChart as RechartsBar, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useData } from "@/contexts/DataContext";
import { useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";

interface ResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ResultsDialog = ({ open, onOpenChange }: ResultsDialogProps) => {
  const { trainingResults } = useData();
  const { toast } = useToast();
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (open && trainingResults) {
      fetchPredictions();
    }
  }, [open, trainingResults]);

  const fetchPredictions = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/predictions?n_samples=10");
      setPredictions(response.data.predictions || []);
    } catch (error: any) {
      console.error("Error fetching predictions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveModel = async () => {
    if (!trainingResults) return;
    
    try {
      const modelName = `model_${Date.now()}`;
      const response = await axios.post(`/save-model?framework=${trainingResults.framework}&model_name=${modelName}`);
      
      toast({
        title: "Modelo guardado",
        description: response.data.message,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Error al guardar el modelo",
        variant: "destructive",
      });
    }
  };

  const handleSaveToSupabase = async () => {
    if (!trainingResults) return;
    
    setLoading(true);
    
    try {
      const response = await axios.post("/save-to-supabase", {
        table_name: "model_results",
        training_results: trainingResults,
        predictions: predictions.length > 0 ? predictions : null,
        model_metadata: {
          model_type: trainingResults.framework === "sklearn" ? "scikit-learn" : "pytorch",
          timestamp: new Date().toISOString()
        }
      });
      
      toast({
        title: "✅ Guardado en Supabase",
        description: response.data.message,
      });
    } catch (error: any) {
      toast({
        title: "Error al guardar en Supabase",
        description: error.response?.data?.detail || "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!trainingResults) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resultados del Modelo</DialogTitle>
            <DialogDescription>
              No hay resultados de entrenamiento disponibles
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const metrics = trainingResults.metrics || {};
  const isClassification = metrics.test_accuracy !== undefined;
  
  const metricsDisplay = [
    { 
      name: "Accuracy", 
      value: metrics.test_accuracy ? `${(metrics.test_accuracy * 100).toFixed(1)}%` : "N/A",
      visible: isClassification
    },
    { 
      name: "Precision", 
      value: metrics.precision ? `${(metrics.precision * 100).toFixed(1)}%` : "N/A",
      visible: isClassification
    },
    { 
      name: "Recall", 
      value: metrics.recall ? `${(metrics.recall * 100).toFixed(1)}%` : "N/A",
      visible: isClassification
    },
    { 
      name: "F1-Score", 
      value: metrics.f1_score ? `${(metrics.f1_score * 100).toFixed(1)}%` : "N/A",
      visible: isClassification
    },
    { 
      name: "R² Score", 
      value: metrics.test_r2 ? metrics.test_r2.toFixed(3) : "N/A",
      visible: !isClassification
    },
    { 
      name: "RMSE", 
      value: metrics.test_rmse ? metrics.test_rmse.toFixed(3) : "N/A",
      visible: !isClassification
    },
  ].filter(m => m.visible);

  const learningCurveData = trainingResults.training_history ? 
    trainingResults.training_history.epochs.map((epoch: number, idx: number) => ({
      epoch,
      training: trainingResults.training_history.train_acc[idx],
      validation: trainingResults.training_history.val_acc[idx]
    })) : [];

  const featureImportanceData = metrics.feature_importance ? 
    metrics.feature_importance.slice(0, 10).map((item: any) => ({
      feature: item.feature,
      importance: (item.importance * 100).toFixed(1)
    })) : [];

  const rocData = metrics.roc_curve ? 
    metrics.roc_curve.fpr.map((fpr: number, idx: number) => ({
      fpr,
      tpr: metrics.roc_curve.tpr[idx]
    })) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Resultados del Modelo</DialogTitle>
          <DialogDescription>
            Visualiza métricas, predicciones y análisis de rendimiento
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="metrics" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="metrics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Métricas
            </TabsTrigger>
            <TabsTrigger value="predictions">
              <TrendingUp className="h-4 w-4 mr-2" />
              Predicciones
            </TabsTrigger>
            <TabsTrigger value="analysis">
              <LineChart className="h-4 w-4 mr-2" />
              Análisis
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="metrics" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {metricsDisplay.map((metric) => (
                <Card key={metric.name}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {metric.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline justify-between">
                      <div className="text-3xl font-bold">{metric.value}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Gráfico de comparación de métricas */}
            {metricsDisplay.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Comparación de Métricas</CardTitle>
                  <CardDescription>Rendimiento del modelo</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsBar data={metricsDisplay.map(m => ({
                      name: m.name,
                      value: parseFloat(m.value.replace('%', '')) || parseFloat(m.value) * 100 || 0
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" name="Valor (%)" />
                    </RechartsBar>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {isClassification && metrics.confusion_matrix && (
              <Card>
                <CardHeader>
                  <CardTitle>Matriz de Confusión</CardTitle>
                  <CardDescription>Evaluación del clasificador</CardDescription>
                </CardHeader>
                <CardContent>
                  {metrics.confusion_matrix.length === 2 ? (
                    <div className="grid grid-cols-2 gap-2 max-w-md">
                      <div className="p-4 bg-success/10 border-2 border-success/20 rounded-lg text-center">
                        <div className="text-2xl font-bold">{metrics.confusion_matrix[0][0]}</div>
                        <div className="text-xs text-muted-foreground">True Negatives</div>
                      </div>
                      <div className="p-4 bg-destructive/10 border-2 border-destructive/20 rounded-lg text-center">
                        <div className="text-2xl font-bold">{metrics.confusion_matrix[0][1]}</div>
                        <div className="text-xs text-muted-foreground">False Positives</div>
                      </div>
                      <div className="p-4 bg-destructive/10 border-2 border-destructive/20 rounded-lg text-center">
                        <div className="text-2xl font-bold">{metrics.confusion_matrix[1][0]}</div>
                        <div className="text-xs text-muted-foreground">False Negatives</div>
                      </div>
                      <div className="p-4 bg-success/10 border-2 border-success/20 rounded-lg text-center">
                        <div className="text-2xl font-bold">{metrics.confusion_matrix[1][1]}</div>
                        <div className="text-xs text-muted-foreground">True Positives</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Matriz de confusión disponible para clasificación binaria
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {rocData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Curva ROC</CardTitle>
                  <CardDescription>
                    AUC = {metrics.auc_score ? metrics.auc_score.toFixed(3) : 'N/A'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsLine data={rocData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fpr" label={{ value: 'False Positive Rate', position: 'insideBottom', offset: -5 }} />
                      <YAxis label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="tpr" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      <Line type="monotone" data={[{fpr:0,tpr:0},{fpr:1,tpr:1}]} dataKey="tpr" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" dot={false} />
                    </RechartsLine>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="predictions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Últimas Predicciones</CardTitle>
                <CardDescription>
                  Predicciones más recientes del modelo entrenado
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-4">Cargando predicciones...</div>
                ) : predictions.length > 0 ? (
                  <div className="space-y-2">
                    {predictions.map((pred) => (
                      <div 
                        key={pred.sample_id} 
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <span className="text-sm">Muestra #{pred.sample_id}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={pred.true_value === pred.predicted_value ? "default" : "destructive"}>
                            Real: {pred.true_value} | Pred: {pred.predicted_value}
                          </Badge>
                          {pred.confidence && (
                            <span className="text-sm text-muted-foreground">
                              Confianza: {(pred.confidence * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No hay predicciones disponibles
                  </div>
                )}
              </CardContent>
            </Card>

            {predictions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Distribución de Predicciones</CardTitle>
                  <CardDescription>Conteo por clase predicha</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsBar data={
                      Object.entries(
                        predictions.reduce((acc: any, pred) => {
                          const val = pred.predicted_value;
                          acc[val] = (acc[val] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([clase, count]) => ({ clase, count }))
                    }>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="clase" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="hsl(var(--primary))" name="Predicciones" />
                    </RechartsBar>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {predictions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Precisión de Predicciones</CardTitle>
                  <CardDescription>Correctas vs Incorrectas</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsBar data={[
                      {
                        name: 'Resultados',
                        correctas: predictions.filter(p => p.true_value === p.predicted_value).length,
                        incorrectas: predictions.filter(p => p.true_value !== p.predicted_value).length
                      }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="correctas" fill="hsl(var(--chart-1))" name="Correctas" />
                      <Bar dataKey="incorrectas" fill="hsl(var(--destructive))" name="Incorrectas" />
                    </RechartsBar>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="analysis" className="space-y-4">
            {learningCurveData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Curva de Aprendizaje</CardTitle>
                  <CardDescription>Training vs Validation Accuracy (PyTorch)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsLine data={learningCurveData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="epoch" label={{ value: 'Épocas', position: 'insideBottom', offset: -5 }} />
                      <YAxis label={{ value: 'Accuracy', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="training" stroke="hsl(var(--primary))" strokeWidth={2} name="Training" />
                      <Line type="monotone" dataKey="validation" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Validation" />
                    </RechartsLine>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Gráfico de pérdida (Loss) para PyTorch */}
            {trainingResults.training_history?.train_loss && (
              <Card>
                <CardHeader>
                  <CardTitle>Curva de Pérdida (Loss)</CardTitle>
                  <CardDescription>Training vs Validation Loss (PyTorch)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsLine data={
                      trainingResults.training_history.epochs.map((epoch: number, idx: number) => ({
                        epoch,
                        train_loss: trainingResults.training_history.train_loss[idx],
                        val_loss: trainingResults.training_history.val_loss?.[idx]
                      }))
                    }>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="epoch" label={{ value: 'Épocas', position: 'insideBottom', offset: -5 }} />
                      <YAxis label={{ value: 'Loss', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="train_loss" stroke="hsl(var(--destructive))" strokeWidth={2} name="Training Loss" />
                      {trainingResults.training_history.val_loss && (
                        <Line type="monotone" dataKey="val_loss" stroke="hsl(var(--chart-3))" strokeWidth={2} name="Validation Loss" />
                      )}
                    </RechartsLine>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {featureImportanceData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Importancia de Características</CardTitle>
                  <CardDescription>Análisis con Scikit-learn</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsBar data={featureImportanceData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis type="category" dataKey="feature" width={80} />
                      <Tooltip />
                      <Bar dataKey="importance" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </RechartsBar>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Estadísticas del Modelo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {trainingResults.model_parameters && (
                    <div>
                      <span className="text-muted-foreground">Parámetros:</span>
                      <span className="ml-2 font-medium">
                        {trainingResults.model_parameters.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {trainingResults.training_time && (
                    <div>
                      <span className="text-muted-foreground">Tiempo de entrenamiento:</span>
                      <span className="ml-2 font-medium">
                        {(trainingResults.training_time / 60).toFixed(1)} min
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Framework:</span>
                    <span className="ml-2 font-medium capitalize">{trainingResults.framework}</span>
                  </div>
                  {trainingResults.training_history?.epochs && (
                    <div>
                      <span className="text-muted-foreground">Épocas:</span>
                      <span className="ml-2 font-medium">
                        {trainingResults.training_history.epochs[trainingResults.training_history.epochs.length - 1]}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar Resultados
          </Button>
          <Button variant="outline" onClick={handleSaveModel}>
            Guardar Modelo
          </Button>
          <Button 
            className="bg-gradient-primary" 
            onClick={handleSaveToSupabase}
            disabled={loading}
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Guardando..." : "Guardar en Supabase"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
