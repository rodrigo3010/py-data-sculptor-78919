# Backend Python para Data Sculptor

Este backend proporciona servicios para procesar archivos CSV usando Pandas, ofreciendo una API REST para la carga y manipulación de datos.

## Requisitos

- Python 3.8 o superior
- pip (gestor de paquetes de Python)

## Instalación

1. Crear un entorno virtual (recomendado):
   ```bash
   python -m venv venv
   ```

2. Activar el entorno virtual:
   - En Windows:
     ```bash
     .\venv\Scripts\activate
     ```
   - En Linux/macOS:
     ```bash
     source venv/bin/activate
     ```

3. Instalar dependencias:
   ```bash
   pip install -r requirements.txt
   ```

## Ejecutar el servidor

1. Asegúrate de estar en el directorio `backend` y tener el entorno virtual activado.

2. Ejecutar el servidor:
   ```bash
   python app.py
   ```

   El servidor estará disponible en `http://localhost:8000`

## Endpoints API

### POST /load-csv
Carga y procesa un archivo CSV.

Parámetros:
- `file`: Archivo CSV (multipart/form-data)
- `delimiter`: Delimitador del CSV (default: ",")
- `encoding`: Codificación del archivo (default: "utf-8")
- `preview_rows`: Número de filas para previsualización (default: 10)

Respuesta:
```json
{
    "success": true,
    "data": [...],
    "columns": [...],
    "totalRows": 100
}
```

### GET /health
Endpoint para verificar el estado del servidor.

Respuesta:
```json
{
    "status": "healthy"
}
```

## Desarrollo

- El backend está construido con FastAPI para máximo rendimiento
- Utiliza Pandas para el procesamiento de datos CSV
- Incluye CORS configurado para desarrollo local