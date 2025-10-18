import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useData } from "@/contexts/DataContext";

const TableView = () => {
  const navigate = useNavigate();
  const { loadedData } = useData();
  const [filters, setFilters] = useState<Record<string, string>>({});

  if (!loadedData) {
    navigate("/");
    return null;
  }

  const { tableName, columns, rows } = loadedData;

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      return columns.every((column) => {
        const filterValue = filters[column]?.toLowerCase() || "";
        if (!filterValue) return true;
        const cellValue = String(row[column] ?? "").toLowerCase();
        return cellValue.includes(filterValue);
      });
    });
  }, [rows, columns, filters]);

  const handleFilterChange = (column: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [column]: value,
    }));
  };

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
          {/* Filtros */}
          <div className="bg-card rounded-lg p-4 shadow-card">
            <h2 className="text-lg font-semibold mb-3">Filtros</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {columns.map((column) => (
                <div key={column} className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    {column}
                  </label>
                  <Input
                    placeholder={`Filtrar por ${column}...`}
                    value={filters[column] || ""}
                    onChange={(e) => handleFilterChange(column, e.target.value)}
                  />
                </div>
              ))}
            </div>
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
                        {columns.map((column) => (
                          <TableCell key={column} className="whitespace-nowrap">
                            {typeof row[column] === "object"
                              ? JSON.stringify(row[column])
                              : String(row[column] ?? "")}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No se encontraron registros con los filtros aplicados
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
