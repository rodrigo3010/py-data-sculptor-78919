from fastapi import FastAPI, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import pandas as pd
import numpy as np
from io import StringIO
from typing import Optional, List, Dict, Any
import json
from pydantic import BaseModel
from supabase_client import supabase
from pathlib import Path
from ml_sklearn_service import SklearnModelTrainer
from ml_pytorch_service import PyTorchModelTrainer
from visualization_service import VisualizationService

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")


# Catch-all route para React Router
# Esto debe ir al FINAL para que no interfiera con tus API routes
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    # Si es un archivo estático específico, intentar servirlo
    static_file = Path(f"static/{full_path}")
    if static_file.is_file():
        return FileResponse(static_file)

    # Para cualquier otra ruta, servir index.html (React Router se encarga)
    return FileResponse("static/index.html")


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CSVResponse(BaseModel):
    success: bool
    data: list
    columns: list
    totalRows: int
    message: Optional[str] = None
    error: Optional[str] = None
    table_name: Optional[str] = None


class CleanDataRequest(BaseModel):
    operation: str
    data: List[dict]
    columns: List[str]
    params: dict


class TrainModelRequest(BaseModel):
    framework: str  # "sklearn" or "pytorch"
    data: List[dict]
    columns: List[str]
    target_column: str
    model_type: str
    task_type: str = "classification"  # "classification" or "regression"
    test_size: float = 0.2
    # Sklearn specific
    cv_folds: Optional[int] = 5
    optimize_hyperparams: Optional[str] = None
    metric: Optional[str] = "accuracy"
    # PyTorch specific
    architecture: Optional[str] = "mlp"
    hidden_layers: Optional[int] = 3
    neurons_per_layer: Optional[int] = 128
    activation: Optional[str] = "relu"
    optimizer: Optional[str] = "adam"
    learning_rate: Optional[float] = 0.001
    epochs: Optional[int] = 50
    batch_size: Optional[int] = 32
    loss_function: Optional[str] = "cross_entropy"


class PredictRequest(BaseModel):
    framework: str
    data: List[dict]
    columns: List[str]
    model_name: str


def clean_missing_values(df: pd.DataFrame, params: dict) -> tuple[pd.DataFrame, str]:
    method = params.get("method", "mean")
    remove_nulls = params.get("removeNulls", False)

    initial_rows = len(df)
    initial_nulls = df.isnull().sum().sum()

    if remove_nulls:
        df = df.dropna()

    numeric_columns = df.select_dtypes(include=[np.number]).columns
    categorical_columns = df.select_dtypes(exclude=[np.number]).columns

    if method == "mean":
        df[numeric_columns] = df[numeric_columns].fillna(df[numeric_columns].mean())
    elif method == "median":
        df[numeric_columns] = df[numeric_columns].fillna(df[numeric_columns].median())
    elif method == "mode":
        for col in df.columns:
            df[col] = df[col].fillna(
                df[col].mode()[0] if not df[col].mode().empty else ""
            )
    elif method == "forward":
        df = df.fillna(method="ffill")
    elif method == "backward":
        df = df.fillna(method="bfill")

    final_nulls = df.isnull().sum().sum()
    rows_removed = initial_rows - len(df) if remove_nulls else 0

    message = f"Valores nulos procesados: {initial_nulls - final_nulls} reemplazados"
    if remove_nulls:
        message += f", {rows_removed} filas eliminadas"

    return df, message


def clean_duplicates(df: pd.DataFrame, params: dict) -> tuple[pd.DataFrame, str]:
    """Eliminar filas duplicadas del DataFrame"""
    remove_duplicates = params.get("removeDuplicates", False)
    
    initial_rows = len(df)
    
    # Identificar columnas que probablemente son IDs (para ignorarlas en la detección)
    id_columns = []
    for col in df.columns:
        col_lower = col.lower()
        # Detectar columnas de ID comunes
        if col_lower in ['id', '_id', 'index', 'row_id', 'pk'] or col_lower.endswith('_id'):
            # Verificar si es única (característica de un ID)
            if df[col].nunique() == len(df):
                id_columns.append(col)
    
    # Columnas a considerar para duplicados (todas excepto IDs)
    columns_to_check = [col for col in df.columns if col not in id_columns]
    
    # Si no hay columnas para verificar (solo IDs), usar todas
    if not columns_to_check:
        columns_to_check = df.columns.tolist()
    
    # Detectar duplicados basándose en las columnas relevantes
    if columns_to_check:
        initial_duplicates = df.duplicated(subset=columns_to_check, keep=False).sum()
        duplicates_to_remove = df.duplicated(subset=columns_to_check, keep='first').sum()
    else:
        initial_duplicates = df.duplicated(keep=False).sum()
        duplicates_to_remove = df.duplicated(keep='first').sum()
    
    if remove_duplicates:
        # Eliminar duplicados basándose en columnas relevantes, manteniendo la primera ocurrencia
        if columns_to_check:
            df = df.drop_duplicates(subset=columns_to_check, keep='first')
        else:
            df = df.drop_duplicates(keep='first')
    
    final_rows = len(df)
    rows_removed = initial_rows - final_rows
    
    # Mensaje informativo
    message = f"Duplicados encontrados: {duplicates_to_remove}"
    if id_columns:
        message += f" (ignorando columnas ID: {', '.join(id_columns)})"
    
    if remove_duplicates:
        message += f". {rows_removed} filas duplicadas eliminadas, manteniendo solo la primera ocurrencia de cada grupo"
    else:
        message += ". Activa 'Eliminar filas duplicadas' para limpiarlos"
    
    return df, message


def clean_inconsistencies(df: pd.DataFrame, params: dict) -> tuple[pd.DataFrame, str]:
    """Limpiar inconsistencias en los datos (espacios, mayúsculas, etc.)"""
    normalize_text = params.get("normalizeText", True)
    remove_spaces = params.get("removeSpaces", True)
    lowercase = params.get("lowercase", False)
    
    initial_rows = len(df)
    changes_made = 0
    
    # Obtener columnas de texto
    text_columns = df.select_dtypes(include=['object']).columns
    
    for col in text_columns:
        if remove_spaces:
            # Eliminar espacios extra al inicio y final
            df[col] = df[col].apply(lambda x: x.strip() if isinstance(x, str) else x)
            changes_made += 1
        
        if lowercase:
            # Convertir a minúsculas
            df[col] = df[col].apply(lambda x: x.lower() if isinstance(x, str) else x)
            changes_made += 1
        
        if normalize_text:
            # Normalizar espacios múltiples a uno solo
            df[col] = df[col].apply(lambda x: ' '.join(x.split()) if isinstance(x, str) else x)
            changes_made += 1
    
    message = f"Inconsistencias procesadas en {len(text_columns)} columnas de texto"
    if changes_made > 0:
        message += f". Se aplicaron {changes_made} transformaciones"
    
    return df, message


@app.post("/load-csv")
async def load_csv(
    file: UploadFile,
    delimiter: str = Form(","),
    encoding: str = Form("utf-8"),
    preview_rows: int = Form(10),
):
    try:
        # Read file content
        content = await file.read()
        text_content = content.decode(encoding)

        # Use pandas to read CSV
        df = pd.read_csv(StringIO(text_content), delimiter=delimiter)

        columns = df.columns.tolist()
        total_rows = len(df)
        
        # Si preview_rows es mayor o igual al total, devolver todas las filas
        # Esto permite cargar el dataset completo cuando se necesita
        if preview_rows >= total_rows or preview_rows >= 1000:
            # Devolver todas las filas para análisis completo
            all_data = df.to_dict("records")
            return CSVResponse(
                success=True,
                data=all_data,
                columns=columns,
                totalRows=total_rows,
                message=f"Archivo CSV cargado exitosamente con {total_rows} filas (dataset completo)",
            )
        else:
            # Devolver solo preview para visualización rápida
            preview_data = df.head(preview_rows).to_dict("records")
            return CSVResponse(
                success=True,
                data=preview_data,
                columns=columns,
                totalRows=total_rows,
                message=f"Archivo CSV cargado: mostrando {len(preview_data)} de {total_rows} filas",
            )

    except Exception as e:
        return CSVResponse(
            success=False, data=[], columns=[], totalRows=0, error=str(e)
        )


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/clean-data")
async def clean_data(request: CleanDataRequest):
    try:
        # Convert input data to DataFrame
        df = pd.DataFrame(request.data, columns=request.columns)
        table_name = None

        # Ejecutar la operación correspondiente
        if request.operation == "missing":
            df, message = clean_missing_values(df, request.params)
        elif request.operation == "normalize":
            # Operación para limpiar duplicados
            df, message = clean_duplicates(df, request.params)
        elif request.operation == "transform":
            # Operación para limpiar inconsistencias
            df, message = clean_inconsistencies(df, request.params)
        else:
            raise ValueError(f"Operación no soportada: {request.operation}")

        # Opcionalmente guardar en Supabase (solo para missing values por ahora)
        if request.operation == "missing":
            try:
                table_name = request.params.get("table_name", "cleaned_data")
                data = df.to_dict("records")

                # First, try to delete existing data if table exists
                try:
                    response = supabase.table(table_name).delete().execute()
                except Exception:
                    pass  # Table might not exist yet

                # Insert new data
                response = supabase.table(table_name).insert(data).execute()

                if hasattr(response, "error") and response.error:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Error al guardar en Supabase: {response.error}",
                    )

                message += (
                    f"\nDatos actualizados en la tabla '{table_name}' de Supabase"
                )

            except Exception as e:
                message += f"\nAdvertencia: No se pudo actualizar Supabase: {str(e)}"

        # Convert back to list of dicts for response
        cleaned_data = df.to_dict("records")

        return CSVResponse(
            success=True,
            data=cleaned_data,
            columns=df.columns.tolist(),
            totalRows=len(df),
            message=message,
            table_name=table_name,
        )

    except Exception as e:
        return CSVResponse(
            success=False, data=[], columns=[], totalRows=0, error=str(e)
        )


# Global instances for ML services
sklearn_trainer = None
pytorch_trainer = None
viz_service = VisualizationService()


@app.post("/train-model")
async def train_model(request: TrainModelRequest):
    """Train a machine learning model with sklearn or PyTorch"""
    global sklearn_trainer, pytorch_trainer
    
    try:
        # Convert data to DataFrame
        df = pd.DataFrame(request.data, columns=request.columns)
        
        print(f"DEBUG: DataFrame shape: {df.shape}")
        print(f"DEBUG: Columns: {df.columns.tolist()}")
        print(f"DEBUG: Target column: {request.target_column}")
        print(f"DEBUG: Task type: {request.task_type}")
        
        # Validate target column
        if request.target_column not in df.columns:
            raise HTTPException(
                status_code=400,
                detail=f"Target column '{request.target_column}' not found in data"
            )
        
        # Validate that there are numeric columns for features
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        if request.target_column in numeric_cols:
            numeric_cols.remove(request.target_column)
        
        if len(numeric_cols) == 0:
            raise HTTPException(
                status_code=400,
                detail="No se encontraron columnas numéricas para usar como características. El dataset debe tener al menos una columna numérica además de la columna objetivo."
            )
        
        results = {}
        
        if request.framework == "sklearn":
            # Train with scikit-learn
            sklearn_trainer = SklearnModelTrainer()
            
            metrics = sklearn_trainer.train(
                df=df,
                target_column=request.target_column,
                model_type=request.model_type,
                task_type=request.task_type,
                test_size=request.test_size,
                cv_folds=request.cv_folds,
                optimize_hyperparams=request.optimize_hyperparams
            )
            
            results = {
                "success": True,
                "framework": "sklearn",
                "metrics": metrics,
                "message": f"Modelo {request.model_type} entrenado exitosamente"
            }
            
            # Generate visualizations
            plots = viz_service.generate_all_plots(metrics, framework="sklearn")
            results["plots"] = plots
            
        elif request.framework == "pytorch":
            # Train with PyTorch
            pytorch_trainer = PyTorchModelTrainer()
            
            training_results = pytorch_trainer.train(
                df=df,
                target_column=request.target_column,
                architecture=request.architecture,
                hidden_layers=request.hidden_layers,
                neurons_per_layer=request.neurons_per_layer,
                activation=request.activation,
                optimizer_name=request.optimizer,
                learning_rate=request.learning_rate,
                epochs=request.epochs,
                batch_size=request.batch_size,
                loss_function=request.loss_function,
                test_size=request.test_size
            )
            
            results = {
                "success": True,
                "framework": "pytorch",
                "metrics": training_results["test_metrics"],
                "training_history": training_results["training_history"],
                "training_time": training_results["training_time"],
                "model_parameters": training_results["model_parameters"],
                "message": f"Red neuronal {request.architecture} entrenada exitosamente"
            }
            
            # Generate visualizations
            plots = viz_service.generate_all_plots(training_results, framework="pytorch")
            results["plots"] = plots
            
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Framework '{request.framework}' no soportado"
            )
        
        return JSONResponse(content=results)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/predictions")
async def get_predictions(n_samples: int = 10):
    """Get sample predictions from the last trained model"""
    global sklearn_trainer, pytorch_trainer
    
    try:
        # Debug: verificar estado de los trainers
        print(f"DEBUG: sklearn_trainer is None: {sklearn_trainer is None}")
        print(f"DEBUG: pytorch_trainer is None: {pytorch_trainer is None}")
        
        if sklearn_trainer is not None:
            print(f"DEBUG: sklearn_trainer tiene X_test: {hasattr(sklearn_trainer, 'X_test')}")
            if hasattr(sklearn_trainer, 'X_test'):
                print(f"DEBUG: X_test shape: {sklearn_trainer.X_test.shape if hasattr(sklearn_trainer.X_test, 'shape') else 'No shape'}")
            
            predictions = sklearn_trainer.get_predictions_sample(n_samples)
            predictions["framework"] = "sklearn"
            predictions["is_classification"] = sklearn_trainer.is_classification
            
            print(f"DEBUG: Predicciones generadas: {len(predictions.get('predictions', []))}")
            return JSONResponse(content=predictions)
            
        elif pytorch_trainer is not None:
            print(f"DEBUG: pytorch_trainer tiene X_test: {hasattr(pytorch_trainer, 'X_test')}")
            
            predictions = pytorch_trainer.get_predictions_sample(n_samples)
            predictions["framework"] = "pytorch"
            predictions["is_classification"] = pytorch_trainer.is_classification
            
            print(f"DEBUG: Predicciones generadas: {len(predictions.get('predictions', []))}")
            return JSONResponse(content=predictions)
            
        else:
            print("DEBUG: No hay modelo entrenado")
            return JSONResponse(content={
                "predictions": [],
                "message": "No model trained yet. Please train a model first."
            })
            
    except Exception as e:
        print(f"ERROR en /predictions: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict")
async def predict(request: PredictRequest):
    """Make predictions with a trained model"""
    global sklearn_trainer, pytorch_trainer
    
    try:
        # Convert data to DataFrame
        df = pd.DataFrame(request.data, columns=request.columns)
        
        if request.framework == "sklearn":
            if sklearn_trainer is None:
                raise HTTPException(
                    status_code=400,
                    detail="No sklearn model trained"
                )
            
            predictions = sklearn_trainer.predict(df.values)
            
        elif request.framework == "pytorch":
            if pytorch_trainer is None:
                raise HTTPException(
                    status_code=400,
                    detail="No PyTorch model trained"
                )
            
            predictions = pytorch_trainer.predict(df.values)
            
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Framework '{request.framework}' no soportado"
            )
        
        return JSONResponse(content={
            "success": True,
            "predictions": predictions.tolist()
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/save-model")
async def save_model(framework: str, model_name: str):
    """Save the trained model"""
    global sklearn_trainer, pytorch_trainer
    
    try:
        if framework == "sklearn":
            if sklearn_trainer is None:
                raise HTTPException(status_code=400, detail="No sklearn model to save")
            
            model_path = sklearn_trainer.save_model(model_name)
            
        elif framework == "pytorch":
            if pytorch_trainer is None:
                raise HTTPException(status_code=400, detail="No PyTorch model to save")
            
            model_path = pytorch_trainer.save_model(model_name)
            
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Framework '{framework}' no soportado"
            )
        
        return JSONResponse(content={
            "success": True,
            "model_path": model_path,
            "message": f"Modelo guardado exitosamente en {model_path}"
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class SaveToSupabaseRequest(BaseModel):
    table_name: str
    training_results: Dict[str, Any]
    predictions: Optional[List[Dict[str, Any]]] = None
    model_metadata: Optional[Dict[str, Any]] = None


@app.post("/save-to-supabase")
async def save_to_supabase(request: SaveToSupabaseRequest):
    """Save training results and predictions to Supabase"""
    try:
        # Preparar datos para guardar
        data_to_insert = {
            "table_name": request.table_name,
            "framework": request.training_results.get("framework"),
            "metrics": request.training_results.get("metrics", {}),
            "model_type": request.model_metadata.get("model_type") if request.model_metadata else None,
            "training_time": request.training_results.get("training_time"),
            "model_parameters": request.training_results.get("model_parameters"),
            "created_at": "now()",
        }
        
        # Guardar en tabla de resultados de modelos
        result = supabase.table("model_results").insert(data_to_insert).execute()
        
        # Si hay predicciones, guardarlas también
        if request.predictions and len(request.predictions) > 0:
            model_id = result.data[0]["id"] if result.data else None
            
            if model_id:
                predictions_data = [
                    {
                        "model_result_id": model_id,
                        "sample_id": pred.get("sample_id"),
                        "true_value": pred.get("true_value"),
                        "predicted_value": pred.get("predicted_value"),
                        "confidence": pred.get("confidence"),
                    }
                    for pred in request.predictions[:100]  # Limitar a 100 predicciones
                ]
                
                supabase.table("model_predictions").insert(predictions_data).execute()
        
        return JSONResponse(content={
            "success": True,
            "message": "Resultados guardados exitosamente en Supabase",
            "record_id": result.data[0]["id"] if result.data else None
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar en Supabase: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=5050)
