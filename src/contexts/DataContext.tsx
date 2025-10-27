import { createContext, useContext, useState, ReactNode } from "react";

export interface LoadedData {
  tableName: string;
  columns: string[];
  rows: any[];
  source: "csv" | "database";
}

export interface TrainingResults {
  framework: string;
  metrics: any;
  plots?: any;
  training_history?: any;
  training_time?: number;
  model_parameters?: number;
  message?: string;
  model_name?: string;
}

export interface Prediction {
  sample_id: number;
  true_value: number;
  predicted_value: number;
  confidence?: number;
  probabilities?: number[];
  error?: number;
  error_percentage?: number;
}

interface DataContextType {
  loadedData: LoadedData | null;
  setLoadedData: (data: LoadedData | null) => void;
  trainingResults: TrainingResults | null;
  setTrainingResults: (results: TrainingResults | null) => void;
  predictions: Prediction[];
  setPredictions: (predictions: Prediction[]) => void;
  completedModules: {
    loader: boolean;
    cleaner: boolean;
    trainer: boolean;
    results: boolean;
  } | null;
  completeModule: (module: "loader" | "cleaner" | "trainer" | "results") => void;
  developerMode: boolean;
  toggleDeveloperMode: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [loadedData, setLoadedData] = useState<LoadedData | null>(null);
  const [trainingResults, setTrainingResults] = useState<TrainingResults | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [completedModules, setCompletedModules] = useState({
    loader: false,
    cleaner: false,
    trainer: false,
    results: false,
  });
  const [developerMode, setDeveloperMode] = useState(false);

  const completeModule = (module: "loader" | "cleaner" | "trainer" | "results") => {
    setCompletedModules(prev => ({ ...prev, [module]: true }));
  };

  const toggleDeveloperMode = () => {
    setDeveloperMode(prev => !prev);
  };

  return (
    <DataContext.Provider value={{ 
      loadedData, 
      setLoadedData, 
      trainingResults, 
      setTrainingResults,
      predictions,
      setPredictions,
      completedModules, 
      completeModule, 
      developerMode, 
      toggleDeveloperMode 
    }}>
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
