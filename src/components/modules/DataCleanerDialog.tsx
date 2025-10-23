import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Droplet, Sparkles, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/contexts/DataContext";

interface DataCleanerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const dirtyData = [
  { id: 1, nombre: "Juan Pérez", edad: null, ciudad: "Madrid", salario: 45000 },
  { id: 2, nombre: null, edad: 34, ciudad: "Barcelona", salario: 52000 },
  { id: 3, nombre: "Carlos López", edad: 41, ciudad: null, salario: 48000 },
  { id: 4, nombre: "Ana Martínez", edad: 29, ciudad: "Sevilla", salario: null },
  { id: 5, nombre: "Pedro Sánchez", edad: 36, ciudad: "Bilbao", salario: 55000 },
];

const cleanedData = [
  { id: 1, nombre: "Juan Pérez", edad: 35, ciudad: "Madrid", salario: 45000 },
  { id: 2, nombre: "Usuario Desconocido", edad: 34, ciudad: "Barcelona", salario: 52000 },
  { id: 3, nombre: "Carlos López", edad: 41, ciudad: "Madrid", salario: 48000 },
  { id: 4, nombre: "Ana Martínez", edad: 29, ciudad: "Sevilla", salario: 50000 },
  { id: 5, nombre: "Pedro Sánchez", edad: 36, ciudad: "Bilbao", salario: 55000 },
];

export const DataCleanerDialog = ({ open, onOpenChange, onComplete }: DataCleanerDialogProps) => {
  const { toast } = useToast();
  const { loadedData, setLoadedData, completeModule } = useData();
  const [showCleaned, setShowCleaned] = useState(false);
  const [cleanedData, setCleanedData] = useState<any[]>([]);
  const [imputationMethod, setImputationMethod] = useState("mean");
  const [removeNulls, setRemoveNulls] = useState(false);
  const [normalizationMethod, setNormalizationMethod] = useState("minmax");
  const [removeOutliers, setRemoveOutliers] = useState(false);
  const [outlierMethod, setOutlierMethod] = useState("iqr");
  const [loading, setLoading] = useState(false);

  const displayData = showCleaned ? cleanedData : (loadedData?.rows.slice(0, 5) || dirtyData);
  const displayColumns = loadedData?.columns || ["id", "nombre", "edad", "ciudad", "salario"];

  const handleClean = async (operation: 'missing' | 'normalize' | 'transform', params: any = {}) => {
    if (!loadedData || !loadedData.rows || loadedData.rows.length === 0) {
      toast({
        title: "No hay datos cargados",
        description: "Por favor carga datos primero usando el módulo 'Cargar Datos'",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('http://161.132.54.35:5050/clean-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation,
          data: loadedData.rows,
          columns: loadedData.columns,
          params,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error en la limpieza de datos');
      }

      if (result.success) {
        setCleanedData(result.data);
        setShowCleaned(true);
        
        // Update the loaded data context
        setLoadedData({
          ...loadedData,
          rows: result.data,
          columns: result.columns,
        });

        toast({
          title: "Datos procesados con Pandas",
          description: result.message,
        });
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error: any) {
      console.error('Error cleaning data:', error);
      toast({
        title: "Error al procesar datos",
        description: error.message || "No se pudieron procesar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Limpiar Datos</DialogTitle>
          <DialogDescription>
            Preprocesa y limpia tus datasets con herramientas avanzadas de Pandas y NumPy
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="missing" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="missing">
              <Droplet className="h-4 w-4 mr-2" />
              Nulos
            </TabsTrigger>
            <TabsTrigger value="normalize">
              <Sparkles className="h-4 w-4 mr-2" />
              Normalizar
            </TabsTrigger>
            <TabsTrigger value="transform">
              <Filter className="h-4 w-4 mr-2" />
              Transformar
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="missing" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Datos {showCleaned ? "después de limpieza" : (loadedData ? "cargados" : "de ejemplo")}</Label>
                <div className="border rounded-lg overflow-hidden max-h-64">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {displayColumns.map((col) => (
                          <TableHead key={col}>{col}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayData.map((row, idx) => (
                        <TableRow key={idx}>
                          {displayColumns.map((col) => (
                            <TableCell key={col}>
                              {row[col] === null || row[col] === undefined || row[col] === '' ? (
                                <Badge variant="destructive">NULL</Badge>
                              ) : (
                                String(row[col])
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {!loadedData && (
                  <p className="text-sm text-muted-foreground text-center">
                    ℹ️ Carga datos desde el módulo "Cargar Datos" para comenzar
                  </p>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="remove-nulls">Eliminar filas con valores nulos</Label>
                <Switch 
                  id="remove-nulls" 
                  checked={removeNulls}
                  onCheckedChange={setRemoveNulls}
                />
              </div>

              <div className="space-y-2">
                <Label>Imputación: Rellenar valores nulos</Label>
                <p className="text-sm text-muted-foreground">
                  Sustituye los valores nulos con un valor calculado
                </p>
                <Select value={imputationMethod} onValueChange={setImputationMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mean">Media - Para datos numéricos (NumPy)</SelectItem>
                    <SelectItem value="median">Mediana - Para datos numéricos (NumPy)</SelectItem>
                    <SelectItem value="mode">Moda - Valor más frecuente (categóricos)</SelectItem>
                    <SelectItem value="forward">Forward Fill - Propagar último valor válido</SelectItem>
                    <SelectItem value="backward">Backward Fill - Propagar siguiente valor válido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                className="w-full bg-gradient-secondary"
                onClick={() => handleClean('missing', {
                  method: imputationMethod,
                  removeNulls,
                })}
                disabled={loading || !loadedData}
              >
                {loading ? "Procesando con Pandas..." : "Aplicar Limpieza de Nulos"}
              </Button>

              {showCleaned && (
                <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                  <p className="text-sm font-medium text-success">
                    ✓ Datos limpiados exitosamente con Pandas y NumPy
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="normalize" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Método de normalización</Label>
                <Select value={normalizationMethod} onValueChange={setNormalizationMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minmax">Min-Max Scaling (0-1)</SelectItem>
                    <SelectItem value="standard">Standardization (Z-score)</SelectItem>
                    <SelectItem value="robust">Robust Scaler</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="remove-outliers">Detectar y remover outliers (NumPy)</Label>
                <Switch 
                  id="remove-outliers"
                  checked={removeOutliers}
                  onCheckedChange={setRemoveOutliers}
                />
              </div>

              <div className="space-y-2">
                <Label>Método de detección de outliers</Label>
                <Select value={outlierMethod} onValueChange={setOutlierMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="iqr">IQR (Rango Intercuartil)</SelectItem>
                    <SelectItem value="zscore">Z-Score</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                className="w-full bg-gradient-secondary"
                onClick={() => handleClean('normalize', {
                  method: normalizationMethod,
                  removeOutliers,
                  outlierMethod,
                })}
                disabled={loading || !loadedData}
              >
                {loading ? "Procesando con Pandas..." : "Aplicar Normalización"}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="transform" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Encoding de variables categóricas</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onehot">One-Hot Encoding</SelectItem>
                    <SelectItem value="label">Label Encoding</SelectItem>
                    <SelectItem value="ordinal">Ordinal Encoding</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="log-transform">Transformación logarítmica</Label>
                <Switch id="log-transform" />
              </div>

              <Button 
                className="w-full bg-gradient-secondary"
                onClick={() => handleClean('transform', {})}
                disabled={loading || !loadedData}
              >
                {loading ? "Procesando con Pandas..." : "Aplicar Transformaciones"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {showCleaned && cleanedData.length > 0 && (
          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={() => {
                completeModule('cleaner');
                onComplete();
              }}
              className="bg-gradient-primary"
            >
              Siguiente: Entrenar Modelos →
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
