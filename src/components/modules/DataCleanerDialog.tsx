import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Droplet, Copy, AlertTriangle } from "lucide-react";
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
  const [enableImputation, setEnableImputation] = useState(false);
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
            <TabsTrigger value="duplicados">
              <Copy className="h-4 w-4 mr-2" />
              Duplicados
            </TabsTrigger>
            <TabsTrigger value="inconsistencia">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Inconsistencia
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="missing" className="space-y-4">
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 border rounded-lg space-y-2">
                <h3 className="font-semibold text-sm">❓ 1️⃣ Datos nulos (missing values)</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Valores faltantes o vacíos en el dataset</li>
                  <li>• Ejemplo: edad sin valor, ciudad en blanco</li>
                  <li>• Problema: impide cálculos y puede sesgar resultados</li>
                </ul>
              </div>

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

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="enable-imputation">Imputación: Rellenar valores nulos</Label>
                    <p className="text-sm text-muted-foreground">
                      Sustituye los valores nulos con un valor calculado
                    </p>
                  </div>
                  <Switch 
                    id="enable-imputation" 
                    checked={enableImputation}
                    onCheckedChange={setEnableImputation}
                  />
                </div>

                {enableImputation && (
                  <div className="space-y-2">
                    <Label>Método de imputación</Label>
                    <Select value={imputationMethod} onValueChange={setImputationMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar método" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mean">Media - Para datos numéricos (NumPy)</SelectItem>
                        <SelectItem value="median">Mediana - Para datos numéricos (NumPy)</SelectItem>
                        <SelectItem value="mode">Moda - Valor más frecuente (categóricos)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <Button 
                className="w-full bg-gradient-secondary"
                onClick={() => handleClean('missing', {
                  method: enableImputation ? imputationMethod : null,
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
          
          <TabsContent value="duplicados" className="space-y-4">
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 border rounded-lg space-y-2">
                <h3 className="font-semibold text-sm">🧬 2️⃣ Datos duplicados</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Registros repetidos total o parcialmente</li>
                  <li>• Ejemplo: dos filas con el mismo nombre y director</li>
                  <li>• Problema: altera conteos, promedios y relaciones</li>
                </ul>
              </div>

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
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="remove-duplicates">Eliminar filas duplicadas</Label>
                <Switch 
                  id="remove-duplicates"
                  checked={removeOutliers}
                  onCheckedChange={setRemoveOutliers}
                />
              </div>

              <Button 
                className="w-full bg-gradient-secondary"
                onClick={() => handleClean('normalize', {
                  removeDuplicates: removeOutliers,
                })}
                disabled={loading || !loadedData}
              >
                {loading ? "Procesando con Pandas..." : "Aplicar Limpieza de Duplicados"}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="inconsistencia" className="space-y-4">
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 border rounded-lg space-y-2">
                <h3 className="font-semibold text-sm">⚠️ 3️⃣ Datos inconsistentes</h3>
                <p className="text-sm text-muted-foreground">Mismo tipo de dato pero escrito diferente.</p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Ejemplo: "Acción", "accion", "ACCIÓN"</li>
                  <li>• "2020", "20O0" (letra O en vez de número 0)</li>
                  <li>• Problema: dificulta análisis y agrupaciones</li>
                </ul>
              </div>

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
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="normalize-text">Normalizar texto (convertir a minúsculas)</Label>
                <Switch id="normalize-text" />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="trim-spaces">Eliminar espacios en blanco extra</Label>
                <Switch id="trim-spaces" />
              </div>

              <Button 
                className="w-full bg-gradient-secondary"
                onClick={() => handleClean('transform', {})}
                disabled={loading || !loadedData}
              >
                {loading ? "Procesando con Pandas..." : "Aplicar Corrección de Inconsistencias"}
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
