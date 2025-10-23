import { useState } from "react";
import { Database, Droplet, Brain, BarChart3, Table } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ModuleCard } from "@/components/ModuleCard";
import { DataLoaderDialog } from "@/components/modules/DataLoaderDialog";
import { DataCleanerDialog } from "@/components/modules/DataCleanerDialog";
import { ModelTrainerDialog } from "@/components/modules/ModelTrainerDialog";
import { ResultsDialog } from "@/components/modules/ResultsDialog";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/contexts/DataContext";

const Index = () => {
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const navigate = useNavigate();
  const { loadedData, completedModules } = useData();

  const modules = [
    {
      id: "loader",
      title: "Cargar Datos",
      description: "Importa archivos CSV o conecta a bases de datos externas",
      icon: Database,
      iconColor: "bg-gradient-primary",
      completed: completedModules.loader,
      disabled: false,
    },
    {
      id: "cleaner",
      title: "Limpiar Datos",
      description: "Preprocesa y limpia tus datasets con herramientas avanzadas",
      icon: Droplet,
      iconColor: "bg-gradient-secondary",
      completed: completedModules.cleaner,
      disabled: !completedModules.loader,
    },
    {
      id: "trainer",
      title: "Entrenar Modelos",
      description: "Configura y entrena modelos con sklearn, PyTorch y más",
      icon: Brain,
      iconColor: "bg-gradient-primary",
      completed: completedModules.trainer,
      disabled: !completedModules.cleaner,
    },
    {
      id: "results",
      title: "Resultados",
      description: "Visualiza métricas, predicciones y análisis de rendimiento",
      icon: BarChart3,
      iconColor: "bg-gradient-secondary",
      completed: completedModules.results,
      disabled: !completedModules.trainer,
    },
    {
      id: "table",
      title: "Tabla",
      description: "Visualiza y filtra los datos cargados en una vista completa",
      icon: Table,
      iconColor: "bg-gradient-primary",
      completed: !!loadedData,
      disabled: !loadedData,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center space-y-2">
            <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              ML Data Pipeline
            </h1>
            <p className="text-lg text-muted-foreground">
              Sistema completo para procesamiento de datos y machine learning
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {modules.map((module) => (
            <ModuleCard
              key={module.id}
              title={module.title}
              description={module.description}
              icon={module.icon}
              iconColor={module.iconColor}
              completed={module.completed}
              onClick={() => {
                if (module.id === "table") {
                  if (loadedData) {
                    navigate("/table-view");
                  }
                } else {
                  setActiveDialog(module.id);
                }
              }}
              className={module.id === "table" ? "md:col-span-2" : ""}
              disabled={module.disabled}
            />
          ))}
        </div>

        {/* Footer Status */}
        <div className="mt-16 max-w-5xl mx-auto">
          <div className="flex items-center justify-center gap-3 p-4 bg-card rounded-lg shadow-card">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm font-medium">Sistema Activo</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>Python</span>
              <span>•</span>
              <Badge variant="outline" className="text-xs">Pandas</Badge>
              <span>•</span>
              <Badge variant="outline" className="text-xs">NumPy</Badge>
              <span>•</span>
              <Badge variant="outline" className="text-xs">PyTorch</Badge>
              <span>•</span>
              <Badge variant="outline" className="text-xs">Scikit-learn</Badge>
            </div>
          </div>
        </div>
      </main>

      {/* Dialogs */}
      <DataLoaderDialog
        open={activeDialog === "loader"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        onComplete={() => setActiveDialog("cleaner")}
      />
      <DataCleanerDialog
        open={activeDialog === "cleaner"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        onComplete={() => setActiveDialog("trainer")}
      />
      <ModelTrainerDialog
        open={activeDialog === "trainer"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        onComplete={() => setActiveDialog("results")}
      />
      <ResultsDialog
        open={activeDialog === "results"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
      />
    </div>
  );
};

export default Index;
