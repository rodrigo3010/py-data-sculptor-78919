from fastapi import FastAPI, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from io import StringIO
from typing import Optional
import json
from pydantic import BaseModel

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
    error: Optional[str] = None


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
            success=True, data=preview_data, columns=columns, totalRows=total_rows
        )

    except Exception as e:
        return CSVResponse(
            success=False, data=[], columns=[], totalRows=0, error=str(e)
        )


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
