import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db, SavedModel } from "@/lib/indexeddb";
import { Trash2, Download, Upload, BarChart3, LineChart, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BarChart as RechartsBar, Bar, LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface SavedModelsViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SavedModelsViewer = ({ open, onOpenChange }: SavedModelsViewerProps) => {
  const [models, setModels] = useState<SavedModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<SavedModel | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadModels();
    }
  }, [open]);

  const loadModels = async () => {
    setLoading(true);
    try {
      await db.init();
      const loadedModels = await db.getModels();
      setModels(loadedModels.sort((a, b) => new Date(b.training_date).getTime() - new Date(a.training_date).getTime()));
    } catch (error) {
      console.error("Error cargando modelos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await db.deleteModel(id);
      toast({
        title: "Modelo eliminado",
        description: "El modelo y sus predicciones han sido eliminados",
      });
      loadModels();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el modelo",
        variant: "destructive",
      });
    }
  };

  const handleExport = async () => {
    try {
      const data = await db.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ml-predictions-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Exportado",
        description: "Datos exportados correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo exportar los datos",
        variant: "destructive",
      });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await db.importData(data);
      
      toast({
        title: "Importado",
        description: "Datos importados correctamente",
      });
      loadModels();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo importar los datos",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Modelos Guardados</DialogTitle>
          <DialogDescription>
            Historial de modelos entrenados y sus predicciones
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" size="sm" asChild>
            <label>
              <Upload className="h-4 w-4 mr-2" />
              Importar
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
            </label>
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8">Cargando modelos guardados...</div>
        ) : models.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                No hay modelos guardados. Entrena un modelo y guárdalo para verlo aquí.
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {models.map((model) => {
              const excellent = model.predictions.filter(p => (p.error_percentage || 0) < 5).length;
              const good = model.predictions.filter(p => (p.error_percentage || 0) >= 5 && (p.error_percentage || 0) < 15).length;
              const poor = model.predictions.filter(p => (p.error_percentage || 0) >= 15).length;

              return (
                <Card key={model.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{model.model_name}</CardTitle>
                        <CardDescription>
                          {new Date(model.training_date).toLocaleString()}
                        </CardDescription>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => model.id && handleDelete(model.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Framework</div>
                        <Badge>{model.framework}</Badge>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Tipo</div>
                        <Badge variant="outline">{model.task_type}</Badge>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Predicciones</div>
                        <div className="font-bold">{model.total_predictions}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Error Promedio</div>
                        <div className="font-bold">
                          {model.avg_error_percentage?.toFixed(1) || 0}%
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="text-center p-2 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-800">
                        <div className="text-lg font-bold text-green-600">
                          {excellent}
                        </div>
                        <div className="text-xs text-muted-foreground">Excelente</div>
                      </div>
                      <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-950 rounded border border-yellow-200 dark:border-yellow-800">
                        <div className="text-lg font-bold text-yellow-600">
                          {good}
                        </div>
                        <div className="text-xs text-muted-foreground">Bueno</div>
                      </div>
                      <div className="text-center p-2 bg-red-50 dark:bg-red-950 rounded border border-red-200 dark:border-red-800">
                        <div className="text-lg font-bold text-red-600">
                          {poor}
                        </div>
                        <div className="text-xs text-muted-foreground">Mejorable</div>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => {
                        setSelectedModel(model);
                        setShowDetails(true);
                      }}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Ver Gráficos y Detalles
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Dialog de detalles del modelo */}
        {selectedModel && (
          <ModelDetailsDialog
            model={selectedModel}
            open={showDetails}
            onOpenChange={setShowDetails}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

// Componente para mostrar detalles del modelo con gráficos
interface ModelDetailsDialogProps {
  model: SavedModel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ModelDetailsDialog = ({ model, open, onOpenChange }: ModelDetailsDialogProps) => {
  const metrics = model.metrics || {};
  const isClassification = metrics.test_accuracy !== undefined;
  const predictions = model.predictions || [];

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

  // Datos para gráfico de predicciones
  const predictionChartData = predictions.length > 0
    ? predictions.slice(0, 10).map((pred) => ({
        muestra: `#${pred.sample_id}`,
        real: Number(pred.true_value),
        predicho: Number(pred.predicted_value)
      }))
    : [];

  // Datos para gráfico de errores
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
          <DialogTitle className="text-2xl">{model.model_name}</DialogTitle>
          <DialogDescription>
            Entrenado el {new Date(model.training_date).toLocaleString()}
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
            <TabsTrigger value="info">
              <LineChart className="h-4 w-4 mr-2" />
              Información
            </TabsTrigger>
          </TabsList>

          {/* PESTAÑA MÉTRICAS */}
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

            {/* Estadísticas de error */}
            {predictions.length > 0 && predictions[0]?.error !== undefined && (
              <Card>
                <CardHeader>
                  <CardTitle>📊 Estadísticas de Error</CardTitle>
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
          </TabsContent>

          {/* PESTAÑA PREDICCIONES */}
          <TabsContent value="predictions" className="space-y-4">
            {/* Lista de predicciones */}
            {predictions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Predicciones del Modelo</CardTitle>
                  <CardDescription>
                    Mostrando {predictions.length} predicciones
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

            {/* Gráfico de barras */}
            {predictionChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>📊 Comparación por Barras</CardTitle>
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
          </TabsContent>

          {/* PESTAÑA INFORMACIÓN */}
          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Información del Modelo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Framework:</span>
                    <span className="ml-2 font-medium capitalize">{model.framework}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tipo de Modelo:</span>
                    <span className="ml-2 font-medium">{model.model_type}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tipo de Tarea:</span>
                    <span className="ml-2 font-medium capitalize">{model.task_type}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Predicciones:</span>
                    <span className="ml-2 font-medium">{model.total_predictions}</span>
                  </div>
                  {model.training_time && (
                    <div>
                      <span className="text-muted-foreground">Tiempo de Entrenamiento:</span>
                      <span className="ml-2 font-medium">
                        {model.training_time < 60
                          ? `${model.training_time.toFixed(1)}s`
                          : `${(model.training_time / 60).toFixed(1)} min`}
                      </span>
                    </div>
                  )}
                  {model.model_parameters && (
                    <div>
                      <span className="text-muted-foreground">Parámetros:</span>
                      <span className="ml-2 font-medium">
                        {model.model_parameters.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumen de Rendimiento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold">
                      {model.total_predictions}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Predicciones</div>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold">
                      {model.avg_error_percentage?.toFixed(1) || 0}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Error Promedio</div>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold capitalize">
                      {model.framework}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Framework</div>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold capitalize">
                      {model.task_type}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Tipo de Tarea</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
