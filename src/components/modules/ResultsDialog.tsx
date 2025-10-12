import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, LineChart, TrendingUp, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart as RechartsLine, Line, BarChart as RechartsBar, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ResultsDialog = ({ open, onOpenChange }: ResultsDialogProps) => {
  const metrics = [
    { name: "Accuracy", value: "94.3%", trend: "+2.1%" },
    { name: "Precision", value: "92.8%", trend: "+1.5%" },
    { name: "Recall", value: "91.2%", trend: "+0.8%" },
    { name: "F1-Score", value: "92.0%", trend: "+1.2%" },
  ];

  const learningCurveData = [
    { epoch: 0, training: 0.85, validation: 0.82 },
    { epoch: 10, training: 0.88, validation: 0.84 },
    { epoch: 20, training: 0.91, validation: 0.87 },
    { epoch: 30, training: 0.93, validation: 0.90 },
    { epoch: 40, training: 0.94, validation: 0.92 },
    { epoch: 50, training: 0.95, validation: 0.93 },
  ];

  const featureImportanceData = [
    { feature: "Feature 1", importance: 85 },
    { feature: "Feature 2", importance: 72 },
    { feature: "Feature 3", importance: 64 },
    { feature: "Feature 4", importance: 51 },
    { feature: "Feature 5", importance: 43 },
  ];

  const rocData = [
    { fpr: 0, tpr: 0 },
    { fpr: 0.1, tpr: 0.65 },
    { fpr: 0.2, tpr: 0.82 },
    { fpr: 0.3, tpr: 0.90 },
    { fpr: 0.4, tpr: 0.94 },
    { fpr: 0.5, tpr: 0.96 },
    { fpr: 1, tpr: 1 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
              {metrics.map((metric) => (
                <Card key={metric.name}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {metric.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline justify-between">
                      <div className="text-3xl font-bold">{metric.value}</div>
                      <Badge variant="outline" className="text-success">
                        {metric.trend}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Matriz de Confusión</CardTitle>
                <CardDescription>Evaluación del clasificador</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 max-w-md">
                  <div className="p-4 bg-success/10 border-2 border-success/20 rounded-lg text-center">
                    <div className="text-2xl font-bold">850</div>
                    <div className="text-xs text-muted-foreground">True Positives</div>
                  </div>
                  <div className="p-4 bg-destructive/10 border-2 border-destructive/20 rounded-lg text-center">
                    <div className="text-2xl font-bold">42</div>
                    <div className="text-xs text-muted-foreground">False Positives</div>
                  </div>
                  <div className="p-4 bg-destructive/10 border-2 border-destructive/20 rounded-lg text-center">
                    <div className="text-2xl font-bold">38</div>
                    <div className="text-xs text-muted-foreground">False Negatives</div>
                  </div>
                  <div className="p-4 bg-success/10 border-2 border-success/20 rounded-lg text-center">
                    <div className="text-2xl font-bold">870</div>
                    <div className="text-xs text-muted-foreground">True Negatives</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Curva ROC</CardTitle>
                <CardDescription>AUC = 0.956</CardDescription>
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
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div 
                      key={i} 
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <span className="text-sm">Muestra #{i}</span>
                      <div className="flex items-center gap-2">
                        <Badge>Clase A</Badge>
                        <span className="text-sm text-muted-foreground">
                          Confianza: {(Math.random() * 20 + 80).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribución de Predicciones</CardTitle>
                <CardDescription>Por clase y confianza</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-center justify-center bg-muted/30 rounded-lg">
                  <p className="text-muted-foreground">
                    Gráfico de distribución (requiere backend)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="analysis" className="space-y-4">
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
                    <YAxis label={{ value: 'Accuracy', angle: -90, position: 'insideLeft' }} domain={[0.8, 1]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="training" stroke="hsl(var(--primary))" strokeWidth={2} name="Training" />
                    <Line type="monotone" dataKey="validation" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Validation" />
                  </RechartsLine>
                </ResponsiveContainer>
              </CardContent>
            </Card>

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

            <Card>
              <CardHeader>
                <CardTitle>Estadísticas del Modelo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Parámetros:</span>
                    <span className="ml-2 font-medium">1,247,832</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tiempo de entrenamiento:</span>
                    <span className="ml-2 font-medium">42.3 min</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Dataset size:</span>
                    <span className="ml-2 font-medium">10,000 samples</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Épocas:</span>
                    <span className="ml-2 font-medium">50</span>
                  </div>
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
          <Button className="bg-gradient-primary">
            Guardar Modelo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
