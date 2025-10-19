from fastapi import FastAPI, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
from io import StringIO
from typing import Optional, List, Dict, Any
import json
from pydantic import BaseModel
from supabase_client import supabase

app = FastAPI()

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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
