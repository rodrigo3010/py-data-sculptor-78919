import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, LineChart, TrendingUp, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart as RechartsBar, Bar, LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useData } from "@/contexts/DataContext";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/indexeddb";

interface ResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ResultsDialog = ({ open, onOpenChange }: ResultsDialogProps) => {
  const { trainingResults, predictions: contextPredictions, setPredictions } = useData();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Cargar predicciones cuando se abre el diálogo
  useEffect(() => {
    if (open && trainingResults) {
      console.log("ResultsDialog abierto, predicciones en contexto:", contextPredictions.length);
      if (contextPredictions.length === 0) {
        console.log("No hay predicciones, obteniendo del backend...");
        fetchPredictions();
      }
    }
  }, [open, trainingResults]);

  const fetchPredictions = async () => {
    // Ya no necesitamos obtener predicciones del backend
    // Las predicciones ya están en el contexto desde el entrenamiento
    if (contextPredictions.length === 0) {
      toast({
        title: "Sin predicciones",
        description: "No se encontraron predicciones. Entrena un modelo primero.",
        variant: "destructive",
      });
    }
  };

  const handleSaveToIndexedDB = async () => {
    if (!trainingResults) return;

    console.log("=== GUARDANDO MODELO ===");
    console.log("Predicciones en contexto:", contextPredictions.length);

    setLoading(true);

    try {
      await db.init();

      let predictions = contextPredictions;

      if (predictions.length === 0) {
        console.log("No hay predicciones en contexto");
        // Ya no obtenemos del backend, las predicciones vienen del entrenamiento frontend
        try {
          predictions = [];
          console.log("Predicciones obtenidas del backend:", predictions.length);
        } catch (error) {
          console.error("Error obteniendo predicciones:", error);
        }
      }

      if (predictions.length === 0) {
        toast({
          title: "⚠️ Sin predicciones",
          description: "No hay predicciones para guardar. Entrena un modelo primero.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const errors = predictions.map(p => p.error || 0);
      const errorPercentages = predictions.map(p => p.error_percentage || 0);

      const savedModel = {
        model_name: `Modelo ${new Date().toLocaleString()}`,
        framework: trainingResults.framework,
        model_type: trainingResults.model_name || 'unknown',
        task_type: metrics.test_accuracy !== undefined ? 'classification' : 'regression',
        training_date: new Date(),
        model_parameters: trainingResults.model_parameters,
        training_time: trainingResults.training_time,
        metrics: trainingResults.metrics,
        predictions: predictions,
        total_predictions: predictions.length,
        avg_error: errors.length > 0 ? errors.reduce((a, b) => a + b, 0) / errors.length : 0,
        avg_error_percentage: errorPercentages.length > 0 ? errorPercentages.reduce((a, b) => a + b, 0) / errorPercentages.length : 0,
        training_results: trainingResults
      };

      console.log("Modelo a guardar:", savedModel);

      await db.saveModel(savedModel);

      toast({
        title: "✅ Guardado Exitosamente",
        description: `Modelo con ${predictions.length} predicciones guardado`,
      });
    } catch (error: any) {
      console.error("Error guardando en IndexedDB:", error);
      toast({
        title: "Error al guardar",
        description: error.message || "Error desconocido",
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
              No hay resultados de entrenamiento disponibles. Por favor, entrena un modelo primero.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const metrics = trainingResults.metrics || {};
  const isClassification = metrics.test_accuracy !== undefined;
  const predictions = contextPredictions;

  // Preparar datos para gráficos
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

  // Datos para gráfico de predicciones (Real vs Predicho) - SOLO DATOS REALES
  const predictionChartData = predictions.length > 0
    ? predictions.slice(0, 10).map((pred) => ({
      muestra: `#${pred.sample_id}`,
      real: Number(pred.true_value),
      predicho: Number(pred.predicted_value)
    }))
    : [];

  // Datos para gráfico de errores (solo regresión) - SOLO DATOS REALES
  const errorChartData = predictions.length > 0
    ? predictions.slice(0, 10).map((pred) => ({
      muestra: `#${pred.sample_id}`,
      error: pred.error_percentage || 0
    }))
    : [];

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

          {/* PESTAÑA MÉTRICAS - CON TODOS LOS GRÁFICOS */}
          <TabsContent value="metrics" className="space-y-4">
            {/* Métricas principales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {metricsDisplay.map((metric, idx) => (
                <Card key={idx}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{metric.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metric.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Gráfico de errores */}
            {errorChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>📈 Distribución de Errores</CardTitle>
                  <CardDescription>
                    Porcentaje de error por predicción
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <RechartsBar data={errorChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="muestra" />
                      <YAxis label={{ value: 'Error (%)', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Bar dataKey="error" fill="#f59e0b" name="Error %" />
                    </RechartsBar>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Estadísticas de error con colores */}
            {predictions.length > 0 && predictions[0]?.error !== undefined && (
              <Card>
                <CardHeader>
                  <CardTitle>📊 Estadísticas de Error</CardTitle>
                  <CardDescription>
                    Métricas de rendimiento del modelo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {(predictions.reduce((sum, p) => sum + (p.error || 0), 0) / predictions.length).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Error Promedio</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg border-2 border-green-200 dark:border-green-800">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {(predictions.reduce((sum, p) => sum + (p.error_percentage || 0), 0) / predictions.length).toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Error % Promedio</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {Math.min(...predictions.map(p => p.error || 0)).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Error Mínimo</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border-2 border-orange-200 dark:border-orange-800">
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {Math.max(...predictions.map(p => p.error || 0)).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Error Máximo</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resumen de rendimiento */}
            {predictions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>📋 Resumen de Rendimiento</CardTitle>
                  <CardDescription>Estadísticas generales del modelo</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold">
                        {predictions.length}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Predicciones</div>
                    </div>
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold">
                        {predictions[0]?.error_percentage !== undefined
                          ? `${(predictions.reduce((sum, p) => sum + (100 - (p.error_percentage || 0)), 0) / predictions.length).toFixed(1)}%`
                          : metricsDisplay[0]?.value || 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Precisión Media</div>
                    </div>
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold">
                        {trainingResults.framework === 'sklearn' ? 'Scikit-learn' : 'PyTorch'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Framework</div>
                    </div>
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold">
                        {isClassification ? 'Clasificación' : 'Regresión'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Tipo de Tarea</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* PESTAÑA PREDICCIONES */}
          <TabsContent value="predictions" className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-muted-foreground">
                    Cargando predicciones...
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Lista de predicciones */}
                {predictions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Últimas Predicciones</CardTitle>
                      <CardDescription>
                        Mostrando {predictions.length} predicciones del modelo
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {predictions.map((pred) => {
                          const isRegression = pred.error !== undefined;
                          const isCorrect = isRegression
                            ? pred.error_percentage < 10
                            : pred.true_value === pred.predicted_value;

                          return (
                            <div
                              key={pred.sample_id}
                              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                            >
                              <span className="text-sm font-medium">Muestra #{pred.sample_id}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant={isCorrect ? "default" : "destructive"}>
                                  Real: {isRegression ? Number(pred.true_value).toFixed(2) : pred.true_value} |
                                  Pred: {isRegression ? Number(pred.predicted_value).toFixed(2) : pred.predicted_value}
                                </Badge>
                                {pred.error !== undefined && (
                                  <span className="text-xs text-muted-foreground">
                                    Error: {pred.error_percentage.toFixed(1)}%
                                  </span>
                                )}
                                {pred.confidence && (
                                  <span className="text-xs text-muted-foreground">
                                    Conf: {(pred.confidence * 100).toFixed(1)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Gráfico: Real vs Predicho */}
                {predictionChartData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>📊 Comparación: Valores Reales vs Predichos</CardTitle>
                      <CardDescription>
                        Visualización de las primeras {Math.min(10, predictions.length)} predicciones
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsLine data={predictionChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="muestra" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="real"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            name="Valor Real"
                            dot={{ fill: '#3b82f6', r: 5 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="predicho"
                            stroke="#10b981"
                            strokeWidth={3}
                            name="Valor Predicho"
                            dot={{ fill: '#10b981', r: 5 }}
                          />
                        </RechartsLine>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}


                {/* Gráfico adicional de barras comparativas */}
                {predictionChartData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>📊 Comparación por Barras</CardTitle>
                      <CardDescription>
                        Visualización alternativa de valores reales vs predichos
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsBar data={predictionChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="muestra" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="real" fill="#3b82f6" name="Valor Real" />
                          <Bar dataKey="predicho" fill="#10b981" name="Valor Predicho" />
                        </RechartsBar>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* PESTAÑA ANÁLISIS */}
          <TabsContent value="analysis" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Información del Modelo</CardTitle>
                <CardDescription>Detalles del entrenamiento</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Framework:</span>
                    <span className="ml-2 font-medium capitalize">{trainingResults.framework}</span>
                  </div>
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
                      <span className="text-muted-foreground">Tiempo:</span>
                      <span className="ml-2 font-medium">
                        {trainingResults.training_time < 60
                          ? `${trainingResults.training_time.toFixed(1)}s`
                          : `${(trainingResults.training_time / 60).toFixed(1)} min`}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="ml-2 font-medium">
                      {isClassification ? "Clasificación" : "Regresión"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {trainingResults.message && (
              <Card>
                <CardHeader>
                  <CardTitle>Mensaje del Sistema</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{trainingResults.message}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Botones de acción */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            onClick={handleSaveToIndexedDB}
            disabled={loading || predictions.length === 0}
            className="bg-gradient-primary"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Guardando..." : "Guardar en IndexedDB"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
