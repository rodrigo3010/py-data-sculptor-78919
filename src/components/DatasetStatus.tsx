import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/contexts/DataContext";
import { CheckCircle2, Database, Droplet } from "lucide-react";

interface DatasetStatusProps {
  showDetails?: boolean;
}

export const DatasetStatus = ({ showDetails = true }: DatasetStatusProps) => {
  const { loadedData, completedModules } = useData();

  if (!loadedData) {
    return null;
  }

  const isClean = completedModules?.cleaner || false;

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-500" />
            <CardTitle className="text-sm font-medium">
              Dataset Actual
            </CardTitle>
          </div>
          {isClean && (
            <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Limpiado
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">
          {loadedData.tableName}
        </CardDescription>
      </CardHeader>
      {showDetails && (
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="text-muted-foreground">Filas:</div>
              <div className="font-bold">{loadedData.rows?.length ?? 0}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-muted-foreground">Columnas:</div>
              <div className="font-bold">{loadedData.columns?.length ?? 0}</div>
            </div>
          </div>
          {isClean && (
            <div className="mt-3 p-2 bg-green-50 dark:bg-green-950/30 rounded-md border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-300">
                <Droplet className="h-3 w-3" />
                <span>Este dataset ha sido limpiado y procesado</span>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
