import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { db, SavedModel } from "@/lib/indexeddb";
import { Trash2, Download, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SavedModelsViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SavedModelsViewer = ({ open, onOpenChange }: SavedModelsViewerProps) => {
  const [models, setModels] = useState<SavedModel[]>([]);
  const [loading, setLoading] = useState(false);
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

                    <div className="grid grid-cols-3 gap-2">
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
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
