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

        # Convert to list for preview (limited rows)
        preview_data = df.head(preview_rows).to_dict("records")
        columns = df.columns.tolist()
        total_rows = len(df)

        return CSVResponse(
            success=True,
            data=preview_data,
            columns=columns,
            totalRows=total_rows,
            message=f"Archivo CSV cargado exitosamente con {total_rows} filas",
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

        if request.operation == "missing":
            df, message = clean_missing_values(df, request.params)

            # Update or create table in Supabase
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
        else:
            raise ValueError(f"Operación no soportada: {request.operation}")

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
        
        # Validate target column
        if request.target_column not in df.columns:
            raise HTTPException(
                status_code=400,
                detail=f"Target column '{request.target_column}' not found in data"
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
        if sklearn_trainer is not None:
            predictions = sklearn_trainer.get_predictions_sample(n_samples)
            predictions["framework"] = "sklearn"
            predictions["is_classification"] = sklearn_trainer.is_classification
            return JSONResponse(content=predictions)
            
        elif pytorch_trainer is not None:
            predictions = pytorch_trainer.get_predictions_sample(n_samples)
            predictions["framework"] = "pytorch"
            predictions["is_classification"] = pytorch_trainer.is_classification
            return JSONResponse(content=predictions)
            
        else:
            return JSONResponse(content={
                "predictions": [],
                "message": "No model trained yet"
            })
            
    except Exception as e:
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=5050)
