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
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [loadedData, setLoadedData] = useState<LoadedData | null>(null);

  return (
    <DataContext.Provider value={{ loadedData, setLoadedData }}>
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
