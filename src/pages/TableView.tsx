import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useData } from "@/contexts/DataContext";

const TableView = () => {
  const navigate = useNavigate();
  const { loadedData } = useData();
  const [searchQuery, setSearchQuery] = useState("");

  if (!loadedData) {
    navigate("/");
    return null;
  }

  const { tableName, columns, rows } = loadedData;

  // Función para resaltar coincidencias
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={index} className="bg-yellow-300 dark:bg-yellow-600 px-0.5 rounded">{part}</mark>
        : part
    );
  };

  // Filtrar filas basándose en la búsqueda global
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    
    const query = searchQuery.toLowerCase().trim();
    
    return rows.filter((row) => {
      // Buscar en todas las columnas
      return columns.some((column) => {
        const cellValue = String(row[column] ?? "").toLowerCase();
        return cellValue.includes(query);
      });
    });
  }, [rows, columns, searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {tableName}
              </h1>
              <p className="text-sm text-muted-foreground">
                {filteredRows.length} de {rows.length} registros
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-4">
          {/* Barra de búsqueda global */}
          <div className="bg-card rounded-lg p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar en todas las columnas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 text-base"
                />
              </div>
              {searchQuery && (
                <Button
                  variant="outline"
                  onClick={() => setSearchQuery("")}
                  className="whitespace-nowrap"
                >
                  Limpiar
                </Button>
              )}
            </div>
            {searchQuery && (
              <p className="text-sm text-muted-foreground mt-2">
                Mostrando {filteredRows.length} coincidencia{filteredRows.length !== 1 ? 's' : ''} de "{searchQuery}"
              </p>
            )}
          </div>

          {/* Tabla */}
          <div className="bg-card rounded-lg shadow-card overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-300px)]">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    {columns.map((column) => (
                      <TableHead key={column} className="whitespace-nowrap">
                        {column}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length > 0 ? (
                    filteredRows.map((row, idx) => (
                      <TableRow key={idx}>
                        {columns.map((column) => {
                          const cellValue = typeof row[column] === "object"
                            ? JSON.stringify(row[column])
                            : String(row[column] ?? "");
                          
                          return (
                            <TableCell key={column} className="whitespace-nowrap">
                              {searchQuery ? highlightMatch(cellValue, searchQuery.trim()) : cellValue}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="text-center py-8 text-muted-foreground"
                      >
                        {searchQuery 
                          ? `No se encontraron resultados para "${searchQuery}"`
                          : "No hay registros para mostrar"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TableView;
