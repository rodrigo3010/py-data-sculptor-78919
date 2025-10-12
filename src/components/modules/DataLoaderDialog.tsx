import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DataLoaderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const mockData = [
  { id: 1, nombre: "Juan Pérez", edad: 28, ciudad: "Madrid", salario: 45000 },
  { id: 2, nombre: "María García", edad: 34, ciudad: "Barcelona", salario: 52000 },
  { id: 3, nombre: "Carlos López", edad: 41, ciudad: "Valencia", salario: 48000 },
  { id: 4, nombre: "Ana Martínez", edad: 29, ciudad: "Sevilla", salario: 43000 },
  { id: 5, nombre: "Pedro Sánchez", edad: 36, ciudad: "Bilbao", salario: 55000 },
];

export const DataLoaderDialog = ({ open, onOpenChange }: DataLoaderDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [showData, setShowData] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      toast({
        title: "Archivo cargado",
        description: `${e.target.files[0].name} listo para procesar`,
      });
    }
  };

  const handleDatabaseConnect = () => {
    toast({
      title: "Conectando a base de datos",
      description: "Esta funcionalidad requiere configuración del backend",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Cargar Datos</DialogTitle>
          <DialogDescription>
            Importa archivos CSV o conecta a bases de datos externas usando Pandas
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="csv" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="csv">
              <Upload className="h-4 w-4 mr-2" />
              Archivo CSV
            </TabsTrigger>
            <TabsTrigger value="database">
              <Database className="h-4 w-4 mr-2" />
              Base de Datos
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="csv" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Seleccionar archivo CSV</Label>
              <Input
                id="file"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
              />
              {file && (
                <p className="text-sm text-muted-foreground">
                  Archivo seleccionado: {file.name}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="delimiter">Delimitador</Label>
              <Select defaultValue=",">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=",">Coma (,)</SelectItem>
                  <SelectItem value=";">Punto y coma (;)</SelectItem>
                  <SelectItem value="\t">Tabulador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="encoding">Codificación</Label>
              <Select defaultValue="utf-8">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utf-8">UTF-8</SelectItem>
                  <SelectItem value="latin-1">Latin-1</SelectItem>
                  <SelectItem value="ascii">ASCII</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              className="w-full bg-gradient-primary"
              onClick={() => setShowData(true)}
            >
              Cargar Dataset con Pandas
            </Button>

            {showData && (
              <div className="mt-4 space-y-2">
                <Label>Vista previa de datos cargados (5 filas)</Label>
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
                      {mockData.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.id}</TableCell>
                          <TableCell>{row.nombre}</TableCell>
                          <TableCell>{row.edad}</TableCell>
                          <TableCell>{row.ciudad}</TableCell>
                          <TableCell>${row.salario.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-sm text-muted-foreground">
                  ✓ Dataset cargado con éxito - 5 filas × 5 columnas
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="database" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="db-type">Tipo de Base de Datos</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="postgresql">PostgreSQL</SelectItem>
                  <SelectItem value="mysql">MySQL</SelectItem>
                  <SelectItem value="sqlite">SQLite</SelectItem>
                  <SelectItem value="mongodb">MongoDB</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="host">Host</Label>
              <Input id="host" placeholder="localhost" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="port">Puerto</Label>
                <Input id="port" placeholder="5432" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="database">Base de Datos</Label>
                <Input id="database" placeholder="mi_database" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input id="username" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" />
            </div>

            <Button 
              className="w-full bg-gradient-primary"
              onClick={handleDatabaseConnect}
            >
              Conectar Base de Datos
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
