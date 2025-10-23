import { createContext, useContext, useState, ReactNode } from "react";

interface LoadedData {
  tableName: string;
  columns: string[];
  rows: any[];
  source: "csv" | "database";
}

interface DataContextType {
  loadedData: LoadedData | null;
  setLoadedData: (data: LoadedData | null) => void;
  completedModules: {
    loader: boolean;
    cleaner: boolean;
    trainer: boolean;
    results: boolean;
  };
  completeModule: (module: "loader" | "cleaner" | "trainer" | "results") => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [loadedData, setLoadedData] = useState<LoadedData | null>(null);
  const [completedModules, setCompletedModules] = useState({
    loader: false,
    cleaner: false,
    trainer: false,
    results: false,
  });

  const completeModule = (module: "loader" | "cleaner" | "trainer" | "results") => {
    setCompletedModules(prev => ({ ...prev, [module]: true }));
  };

  return (
    <DataContext.Provider value={{ loadedData, setLoadedData, completedModules, completeModule }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
