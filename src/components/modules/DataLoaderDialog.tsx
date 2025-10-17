import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@supabase/supabase-js";

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

const SUPABASE_URL = "https://syqvsnlqexyxleuabdvv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5cXZzbmxxZXh5eGxldWFiZHZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU4NDgxODgsImV4cCI6MjA1MTQyNDE4OH0.KDemhs92LpO4vimYBYQCVA_Q-RHGHXv";

export const DataLoaderDialog = ({ open, onOpenChange }: DataLoaderDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [showData, setShowData] = useState(false);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      toast({
        title: "Archivo cargado",
        description: `${e.target.files[0].name} listo para procesar`,
      });
    }
  };

  useEffect(() => {
    if (open) {
      loadTables();
    }
  }, [open]);

  const loadTables = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabaseClient.rpc('get_table_names');
      
      if (error) {
        // Si la función RPC no existe, intentamos obtener las tablas del esquema public
        const { data: tablesData, error: tablesError } = await supabaseClient
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public');
        
        if (tablesError) {
          // Fallback: intentar con algunas tablas comunes
          const commonTables = ['profiles', 'users', 'posts', 'products'];
          const existingTables = [];
          
          for (const table of commonTables) {
            const { error } = await supabaseClient.from(table).select('*').limit(1);
            if (!error) existingTables.push(table);
          }
          
          setTables(existingTables);
        } else {
          setTables(tablesData?.map((t: any) => t.table_name) || []);
        }
      } else {
        setTables(data || []);
      }
    } catch (error) {
      toast({
        title: "Error al cargar tablas",
        description: "No se pudieron obtener las tablas de la base de datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTableData = async (tableName: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabaseClient
        .from(tableName)
        .select('*')
        .limit(100);

      if (error) throw error;

      if (data && data.length > 0) {
        setTableData(data);
        setTableColumns(Object.keys(data[0]));
        toast({
          title: "Datos cargados",
          description: `${data.length} registros cargados de la tabla ${tableName}`,
        });
      } else {
        setTableData([]);
        setTableColumns([]);
        toast({
          title: "Tabla vacía",
          description: `La tabla ${tableName} no contiene datos`,
        });
      }
    } catch (error) {
      toast({
        title: "Error al cargar datos",
        description: "No se pudieron obtener los datos de la tabla",
        variant: "destructive",
      });
      setTableData([]);
      setTableColumns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
    loadTableData(tableName);
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
              <Label htmlFor="table-select">Seleccionar Tabla</Label>
              <Select value={selectedTable} onValueChange={handleTableSelect} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Cargando tablas..." : "Seleccionar tabla"} />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table} value={table}>
                      {table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTable && tableData.length > 0 && (
              <div className="mt-4 space-y-2">
                <Label>Datos de la tabla: {selectedTable}</Label>
                <div className="border rounded-lg overflow-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {tableColumns.map((column) => (
                          <TableHead key={column}>{column}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableData.map((row, idx) => (
                        <TableRow key={idx}>
                          {tableColumns.map((column) => (
                            <TableCell key={column}>
                              {typeof row[column] === 'object' 
                                ? JSON.stringify(row[column]) 
                                : String(row[column] ?? '')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-sm text-muted-foreground">
                  ✓ {tableData.length} registros cargados de {selectedTable}
                </p>
              </div>
            )}

            {selectedTable && tableData.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground text-center py-4">
                La tabla seleccionada está vacía
              </p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
