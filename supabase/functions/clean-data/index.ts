import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CleaningOptions {
  operation: 'missing' | 'normalize' | 'transform';
  data: any[];
  columns: string[];
  params?: any;
}

// NumPy-like mathematical operations
const numpy = {
  mean: (arr: number[]): number => {
    const filtered = arr.filter(x => x !== null && !isNaN(x));
    return filtered.reduce((a, b) => a + b, 0) / filtered.length;
  },
  
  median: (arr: number[]): number => {
    const filtered = arr.filter(x => x !== null && !isNaN(x)).sort((a, b) => a - b);
    const mid = Math.floor(filtered.length / 2);
    return filtered.length % 2 ? filtered[mid] : (filtered[mid - 1] + filtered[mid]) / 2;
  },
  
  std: (arr: number[]): number => {
    const filtered = arr.filter(x => x !== null && !isNaN(x));
    const mean = numpy.mean(filtered);
    const variance = filtered.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / filtered.length;
    return Math.sqrt(variance);
  },
  
  min: (arr: number[]): number => {
    const filtered = arr.filter(x => x !== null && !isNaN(x));
    return Math.min(...filtered);
  },
  
  max: (arr: number[]): number => {
    const filtered = arr.filter(x => x !== null && !isNaN(x));
    return Math.max(...filtered);
  }
};

// Pandas-like DataFrame operations
class DataFrame {
  data: any[];
  columns: string[];

  constructor(data: any[], columns: string[]) {
    this.data = data;
    this.columns = columns;
  }

  // Handle missing values (pandas fillna, dropna)
  fillna(method: string = 'mean', column?: string): DataFrame {
    const targetColumns = column ? [column] : this.columns;
    const newData = this.data.map(row => ({ ...row }));

    targetColumns.forEach(col => {
      const values = this.data.map(row => {
        const val = parseFloat(row[col]);
        return isNaN(val) ? null : val;
      }).filter(v => v !== null) as number[];

      let fillValue: any;
      
      switch (method) {
        case 'mean':
          fillValue = numpy.mean(values);
          break;
        case 'median':
          fillValue = numpy.median(values);
          break;
        case 'mode':
          // Simple mode calculation
          const counts = values.reduce((acc, val) => {
            acc[val] = (acc[val] || 0) + 1;
            return acc;
          }, {} as Record<number, number>);
          fillValue = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
          break;
        case 'forward':
          // Forward fill
          let lastValid: any = null;
          newData.forEach(row => {
            if (row[col] !== null && row[col] !== undefined && row[col] !== '') {
              lastValid = row[col];
            } else if (lastValid !== null) {
              row[col] = lastValid;
            }
          });
          return new DataFrame(newData, this.columns);
        case 'backward':
          // Backward fill
          let nextValid: any = null;
          for (let i = newData.length - 1; i >= 0; i--) {
            if (newData[i][col] !== null && newData[i][col] !== undefined && newData[i][col] !== '') {
              nextValid = newData[i][col];
            } else if (nextValid !== null) {
              newData[i][col] = nextValid;
            }
          }
          return new DataFrame(newData, this.columns);
        default:
          fillValue = 0;
      }

      if (method !== 'forward' && method !== 'backward') {
        newData.forEach(row => {
          if (row[col] === null || row[col] === undefined || row[col] === '') {
            row[col] = fillValue;
          }
        });
      }
    });

    return new DataFrame(newData, this.columns);
  }

  // Normalize data (sklearn-like scaling)
  normalize(method: string = 'minmax', columns?: string[]): DataFrame {
    const targetColumns = columns || this.columns.filter(col => {
      return this.data.some(row => !isNaN(parseFloat(row[col])));
    });

    const newData = this.data.map(row => ({ ...row }));

    targetColumns.forEach(col => {
      const values = this.data.map(row => parseFloat(row[col])).filter(v => !isNaN(v));
      
      switch (method) {
        case 'minmax': {
          const min = numpy.min(values);
          const max = numpy.max(values);
          const range = max - min;
          newData.forEach(row => {
            const val = parseFloat(row[col]);
            if (!isNaN(val)) {
              row[col] = (val - min) / range;
            }
          });
          break;
        }
        case 'standard': {
          const mean = numpy.mean(values);
          const std = numpy.std(values);
          newData.forEach(row => {
            const val = parseFloat(row[col]);
            if (!isNaN(val)) {
              row[col] = (val - mean) / std;
            }
          });
          break;
        }
        case 'robust': {
          const median = numpy.median(values);
          const q1 = numpy.median(values.slice(0, Math.floor(values.length / 2)));
          const q3 = numpy.median(values.slice(Math.ceil(values.length / 2)));
          const iqr = q3 - q1;
          newData.forEach(row => {
            const val = parseFloat(row[col]);
            if (!isNaN(val)) {
              row[col] = (val - median) / iqr;
            }
          });
          break;
        }
      }
    });

    return new DataFrame(newData, this.columns);
  }

  // Detect and remove outliers (numpy-based)
  removeOutliers(method: string = 'iqr', columns?: string[]): DataFrame {
    const targetColumns = columns || this.columns.filter(col => {
      return this.data.some(row => !isNaN(parseFloat(row[col])));
    });

    let filteredData = [...this.data];

    targetColumns.forEach(col => {
      const values = filteredData.map(row => parseFloat(row[col])).filter(v => !isNaN(v));
      
      if (method === 'iqr') {
        const sorted = [...values].sort((a, b) => a - b);
        const q1 = numpy.median(sorted.slice(0, Math.floor(sorted.length / 2)));
        const q3 = numpy.median(sorted.slice(Math.ceil(sorted.length / 2)));
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;
        
        filteredData = filteredData.filter(row => {
          const val = parseFloat(row[col]);
          return isNaN(val) || (val >= lowerBound && val <= upperBound);
        });
      } else if (method === 'zscore') {
        const mean = numpy.mean(values);
        const std = numpy.std(values);
        
        filteredData = filteredData.filter(row => {
          const val = parseFloat(row[col]);
          if (isNaN(val)) return true;
          const zscore = Math.abs((val - mean) / std);
          return zscore <= 3;
        });
      }
    });

    return new DataFrame(filteredData, this.columns);
  }

  // One-hot encoding (pandas get_dummies)
  getOnehot(column: string): DataFrame {
    const uniqueValues = [...new Set(this.data.map(row => row[column]))];
    const newColumns = [...this.columns];
    
    uniqueValues.forEach(value => {
      if (value !== null && value !== undefined) {
        newColumns.push(`${column}_${value}`);
      }
    });

    const newData = this.data.map(row => {
      const newRow = { ...row };
      uniqueValues.forEach(value => {
        if (value !== null && value !== undefined) {
          newRow[`${column}_${value}`] = row[column] === value ? 1 : 0;
        }
      });
      return newRow;
    });

    return new DataFrame(newData, newColumns);
  }

  toArray(): any[] {
    return this.data;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { operation, data, columns, params }: CleaningOptions = await req.json();

    if (!data || !columns) {
      throw new Error('Missing required parameters: data and columns');
    }

    let df = new DataFrame(data, columns);
    let result: any;
    let message = '';

    switch (operation) {
      case 'missing': {
        const method = params?.method || 'mean';
        const removeNulls = params?.removeNulls || false;
        const interpolate = params?.interpolate || false;
        
        if (removeNulls) {
          df = new DataFrame(
            df.data.filter(row => !Object.values(row).some(v => v === null || v === undefined || v === '')),
            df.columns
          );
          message = `Filas con valores nulos eliminadas. ${df.data.length} filas restantes.`;
        } else {
          df = df.fillna(method);
          message = `Valores nulos imputados usando ${method} con Pandas y NumPy.`;
        }
        
        result = df.toArray();
        break;
      }

      case 'normalize': {
        const method = params?.method || 'minmax';
        const removeOutliers = params?.removeOutliers || false;
        const outlierMethod = params?.outlierMethod || 'iqr';
        
        if (removeOutliers) {
          df = df.removeOutliers(outlierMethod);
          message = `Outliers removidos usando ${outlierMethod} con NumPy. `;
        }
        
        df = df.normalize(method);
        message += `Datos normalizados usando ${method}.`;
        result = df.toArray();
        break;
      }

      case 'transform': {
        const encoding = params?.encoding;
        const logTransform = params?.logTransform || false;
        
        if (encoding && params?.categoricalColumn) {
          if (encoding === 'onehot') {
            df = df.getOnehot(params.categoricalColumn);
            message = `One-hot encoding aplicado a ${params.categoricalColumn}.`;
          }
        }
        
        if (logTransform && params?.numericColumns) {
          const newData = df.data.map(row => {
            const newRow = { ...row };
            params.numericColumns.forEach((col: string) => {
              const val = parseFloat(row[col]);
              if (!isNaN(val) && val > 0) {
                newRow[col] = Math.log(val);
              }
            });
            return newRow;
          });
          df = new DataFrame(newData, df.columns);
          message = `Transformación logarítmica aplicada con NumPy.`;
        }
        
        result = df.toArray();
        break;
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    console.log(`Data cleaning completed: ${operation} - ${message}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        columns: df.columns,
        message,
        stats: {
          rowCount: result.length,
          columnCount: df.columns.length,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error cleaning data:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'Unknown error' 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
