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

interface DataCleanerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export const DataCleanerDialog = ({ open, onOpenChange }: DataCleanerDialogProps) => {
  const { toast } = useToast();
  const [showCleaned, setShowCleaned] = useState(false);

  const handleClean = (action: string) => {
    toast({
      title: "Procesando datos",
      description: `Aplicando ${action} con Pandas y NumPy`,
    });
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
                <Label>Datos {showCleaned ? "después de limpieza" : "con valores nulos detectados"}</Label>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Edad</TableHead>
                        <TableHead>Ciudad</TableHead>
                        <TableHead>Salario</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(showCleaned ? cleanedData : dirtyData).map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.id}</TableCell>
                          <TableCell>
                            {row.nombre ?? <Badge variant="destructive">NULL</Badge>}
                          </TableCell>
                          <TableCell>
                            {row.edad ?? <Badge variant="destructive">NULL</Badge>}
                          </TableCell>
                          <TableCell>
                            {row.ciudad ?? <Badge variant="destructive">NULL</Badge>}
                          </TableCell>
                          <TableCell>
                            {row.salario ? `$${row.salario.toLocaleString()}` : <Badge variant="destructive">NULL</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-sm text-muted-foreground">
                  {showCleaned ? "✓ 0 valores nulos - Dataset limpio" : "⚠️ 4 valores nulos detectados en el dataset"}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="remove-nulls">Eliminar filas con valores nulos</Label>
                <Switch id="remove-nulls" />
              </div>

              <div className="space-y-2">
                <Label>Método de imputación</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mean">Media (NumPy)</SelectItem>
                    <SelectItem value="median">Mediana (NumPy)</SelectItem>
                    <SelectItem value="mode">Moda</SelectItem>
                    <SelectItem value="forward">Forward Fill</SelectItem>
                    <SelectItem value="backward">Backward Fill</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="interpolate">Interpolación para series temporales</Label>
                <Switch id="interpolate" />
              </div>

              <Button 
                className="w-full bg-gradient-secondary"
                onClick={() => {
                  handleClean("manejo de valores nulos");
                  setShowCleaned(true);
                }}
              >
                Aplicar Limpieza de Nulos
              </Button>

              {showCleaned && (
                <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                  <p className="text-sm font-medium text-success">
                    ✓ Datos limpiados exitosamente con Pandas y NumPy
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    4 valores nulos fueron imputados usando la media
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="normalize" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Método de normalización</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minmax">Min-Max Scaling (0-1)</SelectItem>
                    <SelectItem value="standard">Standardization (Z-score)</SelectItem>
                    <SelectItem value="robust">Robust Scaler</SelectItem>
                    <SelectItem value="l2">Normalización L2</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="remove-outliers">Detectar y remover outliers (NumPy)</Label>
                <Switch id="remove-outliers" />
              </div>

              <div className="space-y-2">
                <Label>Método de detección de outliers</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="iqr">IQR (Rango Intercuartil)</SelectItem>
                    <SelectItem value="zscore">Z-Score</SelectItem>
                    <SelectItem value="isolation">Isolation Forest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                className="w-full bg-gradient-secondary"
                onClick={() => handleClean("normalización")}
              >
                Aplicar Normalización
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
                    <SelectItem value="target">Target Encoding</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="log-transform">Transformación logarítmica</Label>
                <Switch id="log-transform" />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="poly-features">Crear características polinomiales</Label>
                <Switch id="poly-features" />
              </div>

              <div className="space-y-2">
                <Label>Reducción de dimensionalidad</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pca">PCA (NumPy)</SelectItem>
                    <SelectItem value="tsne">t-SNE</SelectItem>
                    <SelectItem value="umap">UMAP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                className="w-full bg-gradient-secondary"
                onClick={() => handleClean("transformación de datos")}
              >
                Aplicar Transformaciones
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
