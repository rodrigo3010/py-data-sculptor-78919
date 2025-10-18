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
import Papa from "papaparse";

interface DataLoaderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUPABASE_URL = "https://syqvsnlqexyxleuabdvv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5cXZzbmxxZXh5eGxldWFiZHZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNDYzNzAsImV4cCI6MjA3NTYyMjM3MH0.fhHO5pYkHSZzM_yxg0MZrRRVPdC1FCZoxvdgOcZrviM";

export const DataLoaderDialog = ({ open, onOpenChange }: DataLoaderDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [delimiter, setDelimiter] = useState(",");
  const [encoding, setEncoding] = useState("utf-8");
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setCsvData([]);
      setCsvColumns([]);
      toast({
        title: "Archivo seleccionado",
        description: `${selectedFile.name} listo para procesar`,
      });
    }
  };

  const loadCSVData = () => {
    if (!file) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo CSV",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    Papa.parse(file, {
      header: true,
      delimiter: delimiter,
      encoding: encoding,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const data = results.data.filter((row: any) => 
            Object.values(row).some(val => val !== null && val !== undefined && val !== '')
          );
          
          if (data.length > 0) {
            setCsvData(data.slice(0, 100)); // Limitar a 100 filas
            setCsvColumns(Object.keys(data[0]));
            toast({
              title: "CSV cargado exitosamente",
              description: `${data.length} filas cargadas`,
            });
          } else {
            toast({
              title: "Archivo vacío",
              description: "El archivo CSV no contiene datos válidos",
              variant: "destructive",
            });
          }
        }
        setLoading(false);
      },
      error: (error) => {
        toast({
          title: "Error al leer CSV",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
      },
    });
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
        console.error("Error loading tables:", error);
        toast({
          title: "Error al cargar tablas",
          description: error.message || "No se pudieron obtener las tablas de la base de datos",
          variant: "destructive",
        });
        setTables([]);
      } else {
        const tableNames = data?.map((item: any) => item.table_name) || [];
        setTables(tableNames);
        if (tableNames.length > 0) {
          toast({
            title: "Tablas cargadas",
            description: `Se encontraron ${tableNames.length} tablas en la base de datos`,
          });
        }
      }
    } catch (error: any) {
      console.error("Error loading tables:", error);
      toast({
        title: "Error al cargar tablas",
        description: error.message || "No se pudieron obtener las tablas de la base de datos",
        variant: "destructive",
      });
      setTables([]);
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
              <Select value={delimiter} onValueChange={setDelimiter}>
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
              <Select value={encoding} onValueChange={setEncoding}>
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
              onClick={loadCSVData}
              disabled={!file || loading}
            >
              {loading ? "Cargando..." : "Cargar Dataset"}
            </Button>

            {csvData.length > 0 && (
              <div className="mt-4 space-y-2">
                <Label>Vista previa de datos cargados</Label>
                <div className="border rounded-lg overflow-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {csvColumns.map((column) => (
                          <TableHead key={column}>{column}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvData.map((row, idx) => (
                        <TableRow key={idx}>
                          {csvColumns.map((column) => (
                            <TableCell key={column}>
                              {String(row[column] ?? '')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-sm text-muted-foreground">
                  ✓ Dataset cargado con éxito - {csvData.length} filas × {csvColumns.length} columnas
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
