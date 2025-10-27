const DB_NAME = 'MLPredictionsDB';
const DB_VERSION = 2;

interface SavedModel {
  id?: number;
  model_name: string;
  framework: string;
  model_type: string;
  task_type: string;
  training_date: Date;
  model_parameters?: number;
  training_time?: number;
  metrics: any;
  predictions: any[];
  total_predictions: number;
  avg_error?: number;
  avg_error_percentage?: number;
  training_results: any;
  dataset?: {
    tableName: string;
    columns: string[];
    rows: any[];
    totalRows: number;
  };
}

class IndexedDBService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;

        if (db.objectStoreNames.contains('models')) {
          db.deleteObjectStore('models');
        }
        if (db.objectStoreNames.contains('predictions')) {
          db.deleteObjectStore('predictions');
        }
        if (db.objectStoreNames.contains('datasets')) {
          db.deleteObjectStore('datasets');
        }
        if (db.objectStoreNames.contains('training_history')) {
          db.deleteObjectStore('training_history');
        }

        const savedModelsStore = db.createObjectStore('saved_models', { keyPath: 'id', autoIncrement: true });
        savedModelsStore.createIndex('framework', 'framework', { unique: false });
        savedModelsStore.createIndex('task_type', 'task_type', { unique: false });
        savedModelsStore.createIndex('training_date', 'training_date', { unique: false });
      };
    });
  }

  async saveModel(model: SavedModel): Promise<number> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['saved_models'], 'readwrite');
      const store = transaction.objectStore('saved_models');
      const request = store.add(model);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getModels(): Promise<SavedModel[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['saved_models'], 'readonly');
      const store = transaction.objectStore('saved_models');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getModel(id: number): Promise<SavedModel | undefined> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['saved_models'], 'readonly');
      const store = transaction.objectStore('saved_models');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteModel(id: number): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['saved_models'], 'readwrite');
      const store = transaction.objectStore('saved_models');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['saved_models'], 'readwrite');
      transaction.objectStore('saved_models').clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async exportData(): Promise<any> {
    const models = await this.getModels();
    return {
      models,
      exportDate: new Date().toISOString()
    };
  }

  async importData(data: any): Promise<void> {
    await this.clearAll();
    
    for (const model of data.models) {
      const { id, ...modelData } = model;
      await this.saveModel(modelData);
    }
  }
}

export const db = new IndexedDBService();
export type { SavedModel };
