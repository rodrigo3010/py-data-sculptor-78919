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
  // Estado global
  const [imputationMethod, setImputationMethod] = useState("mean");
  const [enableImputation, setEnableImputation] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estado por sección
  const [removeNulls, setRemoveNulls] = useState(false); // Nulos
  const [removeDuplicates, setRemoveDuplicates] = useState(false); // Duplicados
  const [normalizeText, setNormalizeText] = useState(false); // Inconsistencias
  const [trimSpaces, setTrimSpaces] = useState(true); // Inconsistencias

  const displayData = showCleaned ? cleanedData : (loadedData?.rows.slice(0, 5) || dirtyData);
  const displayColumns = loadedData?.columns || ["id", "nombre", "edad", "ciudad", "salario"];

  // Calculate statistics
  const calculateNulls = () => {
    if (!loadedData || !loadedData.rows || loadedData.rows.length === 0) return 0;
    let nullCount = 0;
    loadedData.rows.forEach(row => {
      loadedData.columns.forEach(col => {
        const value = row[col];
        // Detectar null, undefined, strings vacíos, "null", "NULL", "NaN", espacios
        if (
          value === null ||
          value === undefined ||
          value === '' ||
          value === 'null' ||
          value === 'NULL' ||
          value === 'NaN' ||
          value === 'nan' ||
          (typeof value === 'string' && value.trim() === '') ||
          (typeof value === 'number' && isNaN(value))
        ) {
          nullCount++;
        }
      });
    });
    return nullCount;
  };

  const calculateDuplicates = () => {
    if (!loadedData || !loadedData.rows || loadedData.rows.length === 0) return 0;

    // Identificar columnas que probablemente son IDs (para ignorarlas)
    const idColumns = loadedData.columns.filter(col => {
      const colLower = col.toLowerCase();
      // Detectar columnas de ID comunes
      if (colLower === "id" || colLower === "_id" || colLower === "index" ||
          colLower === "row_id" || colLower === "pk" || colLower.endsWith("_id")) {
        // Verificar si es única (característica de un ID)
        const uniqueValues = new Set(loadedData.rows.map(r => r[col]));
        return uniqueValues.size === loadedData.rows.length;
      }
      return false;
    });

    // Columnas a considerar para duplicados (todas excepto IDs)
    const columnsToCheck = loadedData.columns.filter(col => !idColumns.includes(col));

    // Si no hay columnas para verificar, usar todas
    const finalColumns = columnsToCheck.length > 0 ? columnsToCheck : loadedData.columns;

    const seen = new Set();
    const duplicateRows = [];

    // Primera pasada: identificar todas las filas duplicadas
    loadedData.rows.forEach(row => {
      const rowKey = finalColumns
        .map(col => {
          const value = row[col];
          // Normalizar valores para comparación
          if (value === null || value === undefined || value === "") return "NULL";
          if (typeof value === "string") return value.trim().toLowerCase();
          return String(value);
        })
        .join("|");

      if (seen.has(rowKey)) {
        duplicateRows.push(rowKey);
      } else {
        seen.add(rowKey);
      }
    });

    // Segunda pasada: contar solo las apariciones después de la primera
    const duplicateCounts = new Map();
    let totalDuplicates = 0;
    
    loadedData.rows.forEach(row => {
      const rowKey = finalColumns
        .map(col => {
          const value = row[col];
          if (value === null || value === undefined || value === "") return "NULL";
          if (typeof value === "string") return value.trim().toLowerCase();
          return String(value);
        })
        .join("|");

      if (duplicateRows.includes(rowKey)) {
        const count = (duplicateCounts.get(rowKey) || 0) + 1;
        duplicateCounts.set(rowKey, count);
        // Solo contar si no es la primera ocurrencia
        if (count > 1) {
          totalDuplicates++;
        }
      }
    });

    return totalDuplicates;
  };

  // Obtener ejemplos de filas duplicadas
  const getDuplicateExamples = () => {
    if (!loadedData || !loadedData.rows || loadedData.rows.length === 0) return [];

    // Identificar columnas que probablemente son IDs (para ignorarlas)
    const idColumns = loadedData.columns.filter(col => {
      const colLower = col.toLowerCase();
      if (colLower === 'id' || colLower === '_id' || colLower === 'index' ||
          colLower === 'row_id' || colLower === 'pk' || colLower.endsWith('_id')) {
        const uniqueValues = new Set(loadedData.rows.map(r => r[col]));
        return uniqueValues.size === loadedData.rows.length;
      }
      return false;
    });

    // Columnas a considerar para duplicados (todas excepto IDs)
    const columnsToCheck = loadedData.columns.filter(col => !idColumns.includes(col));
    const finalColumns = columnsToCheck.length > 0 ? columnsToCheck : loadedData.columns;

    const rowMap = new Map<string, number[]>();

    loadedData.rows.forEach((row, index) => {
      const rowKey = finalColumns
        .map(col => {
          const value = row[col];
          if (value === null || value === undefined || value === '') return 'NULL';
          if (typeof value === 'string') return value.trim().toLowerCase();
          return String(value);
        })
        .join('|');

      if (!rowMap.has(rowKey)) {
        rowMap.set(rowKey, []);
      }
      rowMap.get(rowKey)!.push(index);
    });

    // Retornar solo las filas que tienen duplicados
    const duplicateGroups: Array<{indices: number[], row: any}> = [];
    rowMap.forEach((indices, key) => {
      if (indices.length > 1) {
        duplicateGroups.push({
          indices,
          row: loadedData.rows[indices[0]]
        });
      }
    });

    return duplicateGroups.slice(0, 3); // Máximo 3 ejemplos
  };

  // Calcular nulos por columna
  const getNullsByColumn = () => {
    if (!loadedData || !loadedData.rows || loadedData.rows.length === 0) return {};
    const nullsByCol: Record<string, number> = {};

    loadedData.columns.forEach(col => {
      nullsByCol[col] = 0;
      loadedData.rows.forEach(row => {
        const value = row[col];
        if (
          value === null ||
          value === undefined ||
          value === '' ||
          value === 'null' ||
          value === 'NULL' ||
          value === 'NaN' ||
          value === 'nan' ||
          (typeof value === 'string' && value.trim() === '') ||
          (typeof value === 'number' && isNaN(value))
        ) {
          nullsByCol[col]++;
        }
      });
    });

    return nullsByCol;
  };

  const calculateInconsistencies = (data: any[] = loadedData?.rows || [], columns: string[] = loadedData?.columns || []) => {
    if (!data || data.length === 0 || !columns || columns.length === 0) return 0;
    let inconsistencies = 0;

    columns.forEach(column => {
      const values = data.map(row => row[column]).filter(v => v !== null && v !== undefined && v !== "");
      const valueMap = new Map();

      // Agrupar valores similares (sin considerar mayúsculas/espacios)
      values.forEach(value => {
        if (typeof value === "string") {
          const normalized = value.toString().trim().toLowerCase();
          if (!valueMap.has(normalized)) {
            valueMap.set(normalized, []);
          }
          valueMap.get(normalized).push(value);
        }
      });

      // Contar inconsistencias (variantes del mismo valor)
      valueMap.forEach(variants => {
        if (variants.length > 1 && new Set(variants).size > 1) {
          inconsistencies += variants.length - 1;
        }
      });
    });

    return inconsistencies;
  };

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
      const response = await fetch('/clean-data', {
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
      <DialogContent className="max-w-5xl">
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
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">❓ 1️⃣ Datos nulos (missing values)</h3>
                  {loadedData && (
                    <Badge variant="destructive" className="text-xs">
                      {calculateNulls()} valores nulos de {loadedData.rows.length * loadedData.columns.length} totales
                    </Badge>
                  )}
                </div>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Valores faltantes o vacíos en el dataset</li>
                  <li>• Ejemplo: edad sin valor, ciudad en blanco</li>
                  <li>• Problema: impide cálculos y puede sesgar resultados</li>
                </ul>

                {/* Mostrar nulos por columna */}
                {loadedData && calculateNulls() > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Nulos por columna:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(getNullsByColumn()).map(([col, count]) => (
                        count > 0 && (
                          <div key={col} className="flex items-center justify-between p-2 bg-background rounded border">
                            <span className="text-xs font-medium truncate">{col}</span>
                            <Badge variant="outline" className="text-xs">
                              {count} ({((count / loadedData.rows.length) * 100).toFixed(1)}%)
                            </Badge>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Datos {showCleaned ? "después de limpieza" : (loadedData ? "cargados" : "de ejemplo")}</Label>
                <div className="border rounded-lg overflow-auto h-[380px] max-h-[60vh] w-full">
                  <div style={{ minWidth: "900px" }}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {displayColumns.map((col) => (
                            <TableHead key={col}>{col}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          const sourceRows = loadedData && loadedData.rows && loadedData.rows.length > 0
                            ? loadedData.rows
                            : displayData;
                          const hasNull = (r: any) =>
                            displayColumns.some(col => {
                              const value = r[col];
                              return (
                                value === null ||
                                value === undefined ||
                                value === '' ||
                                value === 'null' ||
                                value === 'NULL' ||
                                value === 'NaN' ||
                                value === 'nan' ||
                                (typeof value === 'string' && value.trim() === '') ||
                                (typeof value === 'number' && isNaN(value))
                              );
                            });
                          const rowsToShow = sourceRows.filter(hasNull);
                          if (rowsToShow.length === 0) {
                            return (
                              <TableRow>
                                <TableCell colSpan={displayColumns.length} className="text-center text-sm text-muted-foreground">
                                  No hay filas con valores nulos
                                </TableCell>
                              </TableRow>
                            );
                          }
                          return rowsToShow.map((row, idx) => (
                            <TableRow key={idx} className="bg-yellow-50 dark:bg-yellow-900/10">
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
                          ));
                        })()}
                      </TableBody>
                    </Table>
                  </div>
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
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">🧬 2️⃣ Datos duplicados</h3>
                  {loadedData && (
                    <Badge variant="destructive" className="text-xs">
                      {calculateDuplicates()} filas duplicadas de {loadedData.rows.length} totales
                    </Badge>
                  )}
                </div>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• <strong>Filas con datos duplicados:</strong> Mismos valores (ignora columnas ID)</li>
                  <li>• Ejemplo: Fila 1 y Fila 5 tienen los mismos datos, solo difieren en ID</li>
                  <li>• <strong>Acción:</strong> Elimina todas las copias excepto la primera</li>
                </ul>

                {/* Mostrar porcentaje de duplicados */}
                {loadedData && calculateDuplicates() > 0 && (
                  <div className="mt-3 space-y-3">
                    <div className="p-3 bg-background rounded border">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">Porcentaje de duplicados:</span>
                        <Badge variant="outline" className="text-xs">
                          {((calculateDuplicates() / loadedData.rows.length) * 100).toFixed(2)}%
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">Filas únicas:</span>
                        <Badge variant="outline" className="text-xs">
                          {loadedData.rows.length - calculateDuplicates()}
                        </Badge>
                      </div>
                    </div>

                    {/* Ejemplos de filas duplicadas */}
                    {getDuplicateExamples().length > 0 && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded border border-yellow-200 dark:border-yellow-800">
                        <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                          📋 Ejemplos de filas duplicadas:
                        </p>
                        {getDuplicateExamples().map((group, idx) => (
                          <div key={idx} className="text-xs text-yellow-700 dark:text-yellow-300 mb-1">
                            • Filas {group.indices.join(', ')} son idénticas ({group.indices.length} copias)
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Datos {showCleaned ? "después de limpieza" : (loadedData ? "cargados" : "de ejemplo")}</Label>
                <div className="border rounded-lg overflow-auto h-[380px] max-h-[60vh] w-full">
                  <div style={{ minWidth: "900px" }}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {displayColumns.map((col) => (
                            <TableHead key={col}>{col}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          if (!loadedData || !loadedData.rows || loadedData.rows.length === 0) {
                            return (
                              <TableRow>
                                <TableCell colSpan={displayColumns.length} className="text-center text-sm text-muted-foreground">
                                  No hay datos cargados
                                </TableCell>
                              </TableRow>
                            );
                          }
                          const idColumns = loadedData.columns.filter(col => {
                            const colLower = col.toLowerCase();
                            if (colLower === 'id' || colLower === '_id' || colLower === 'index' ||
                                colLower === 'row_id' || colLower === 'pk' || colLower.endsWith('_id')) {
                              const uniqueValues = new Set(loadedData.rows.map(r => r[col]));
                              return uniqueValues.size === loadedData.rows.length;
                            }
                            return false;
                          });
                          const columnsToCheck = loadedData.columns.filter(col => !idColumns.includes(col));
                          const finalColumns = columnsToCheck.length > 0 ? columnsToCheck : loadedData.columns;
                          const occurrences = loadedData.rows.reduce((acc, r, i) => {
                            const key = finalColumns
                              .map(col => {
                                const value = r[col];
                                if (value === null || value === undefined || value === '') return 'NULL';
                                if (typeof value === 'string') return value.trim().toLowerCase();
                                return String(value);
                              })
                              .join('|');
                            if (!acc[key]) acc[key] = [];
                            acc[key].push(i);
                            return acc;
                          }, {} as Record<string, number[]>);
                          const rowsToShow = loadedData.rows.filter(r => {
                            const key = finalColumns
                              .map(col => {
                                const value = r[col];
                                if (value === null || value === undefined || value === '') return 'NULL';
                                if (typeof value === 'string') return value.trim().toLowerCase();
                                return String(value);
                              })
                              .join('|');
                            return occurrences[key] && occurrences[key].length > 1;
                          });
                          if (rowsToShow.length === 0) {
                            return (
                              <TableRow>
                                <TableCell colSpan={displayColumns.length} className="text-center text-sm text-muted-foreground">
                                  No hay filas duplicadas
                                </TableCell>
                              </TableRow>
                            );
                          }
                          return rowsToShow.map((row, idx) => (
                            <TableRow key={idx} className="bg-yellow-50 dark:bg-yellow-900/10">
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
                          ));
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="remove-duplicates">Eliminar filas duplicadas</Label>
                <Switch
                  id="remove-duplicates"
                  checked={removeDuplicates}
                  onCheckedChange={setRemoveDuplicates}
                />
              </div>

              <Button
                className="w-full bg-gradient-secondary"
                onClick={() => handleClean('normalize', {
                  removeDuplicates: removeDuplicates,
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
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">⚠️ 3️⃣ Datos inconsistentes</h3>
                  {loadedData && (
                    <Badge variant="destructive" className="text-xs">
                      {calculateInconsistencies()} inconsistencias
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Mismo tipo de dato pero escrito diferente.</p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Ejemplo: "Acción", "accion", "ACCIÓN"</li>
                  <li>• "2020", "20O0" (letra O en vez de número 0)</li>
                  <li>• Problema: dificulta análisis y agrupaciones</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label>Datos {showCleaned ? "después de limpieza" : (loadedData ? "cargados" : "de ejemplo")}</Label>
                <div className="border rounded-lg overflow-hidden h-[380px] w-full">
                  <div style={{ minWidth: "900px" }}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {displayColumns.map((col) => (
                            <TableHead key={col}>{col}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody className="block h-[340px] overflow-y-auto">
                        {(() => {
                          const sourceRows = loadedData && loadedData.rows && loadedData.rows.length > 0
                            ? loadedData.rows
                            : displayData;

                          const isInconsistent = (row: any) => {
                            return displayColumns.some(col => {
                              const value = row[col];
                              if (value === null || value === undefined || value === "") return false;
                              const strValue = String(value);
                              const normalized = strValue.trim().toLowerCase();
                              // Verificar si hay otras variantes del mismo valor normalizado
                              return sourceRows.some(otherRow => {
                                const otherValue = otherRow[col];
                                if (otherValue === null || otherValue === undefined || otherValue === "") return false;
                                return String(otherValue).trim().toLowerCase() === normalized && 
                                       String(otherValue) !== strValue;
                              });
                            });
                          };

                          const rowsToShow = sourceRows.filter(isInconsistent);
                          if (rowsToShow.length === 0) {
                            return (
                              <TableRow>
                                <TableCell colSpan={displayColumns.length} className="text-center text-sm text-muted-foreground">
                                  No hay filas con inconsistencias de texto
                                </TableCell>
                              </TableRow>
                            );
                          }
                          return rowsToShow.map((row, idx) => (
  <TableRow key={idx} className="bg-orange-50 dark:bg-orange-900/10">
                              {displayColumns.map((col) => (
                                <TableCell key={col}>
                                  {row[col] === null || row[col] === undefined || row[col] === "" ? (
                                    <Badge variant="destructive">NULL</Badge>
                                  ) : (
                                    String(row[col])
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ));
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="normalize-text">Normalizar texto (convertir a minúsculas)</Label>
                <Switch
                  id="normalize-text"
                  checked={normalizeText}
                  onCheckedChange={setNormalizeText}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="trim-spaces">Eliminar espacios en blanco extra</Label>
                <Switch
                  id="trim-spaces"
                  checked={trimSpaces}
                  onCheckedChange={setTrimSpaces}
                />
              </div>

              <Button
                className="w-full bg-gradient-secondary"
                onClick={() => handleClean('transform', {
                  normalizeText: trimSpaces,
                  removeSpaces: trimSpaces,
                  lowercase: normalizeText,
                })}
                disabled={loading || !loadedData}
              >
                {loading ? "Procesando con Pandas..." : "Aplicar Limpieza de Inconsistencias"}
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
