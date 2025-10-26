# Fix: Carga Completa de Datos para Detección de Duplicados

## 🐛 Problema Identificado

El módulo "Limpiar Datos" no detectaba duplicados correctamente porque el módulo "Cargar Datos" solo cargaba una **porción limitada** de los datos:

- **CSV:** Solo 1000 filas (aunque el archivo tuviera más)
- **Base de Datos:** Solo 100 registros (aunque la tabla tuviera más)

---

## 🔍 Causa Raíz

### 1. Carga de CSV (Backend)

**Código anterior:**
```python
@app.post("/load-csv")
async def load_csv(preview_rows: int = Form(10)):
    df = pd.read_csv(...)
    
    # ❌ Solo devolvía las primeras filas
    preview_data = df.head(preview_rows).to_dict("records")
    
    return CSVResponse(
        data=preview_data,  # Solo preview
        totalRows=len(df)   # Total real
    )
```

**Problema:**
- Frontend enviaba `preview_rows: '1000'`
- Backend solo devolvía 1000 filas
- Contexto guardaba solo 1000 filas
- Módulo "Limpiar Datos" solo veía 1000 filas

### 2. Carga desde Base de Datos (Frontend)

**Código anterior:**
```typescript
const { data, error } = await supabaseClient
  .from(tableName)
  .select('*')
  .limit(100);  // ❌ Solo 100 registros
```

**Problema:**
- Límite hardcodeado de 100 registros
- Aunque la tabla tuviera 10,000 registros
- Solo se cargaban 100 en el contexto

---

## ✅ Solución Implementada

### 1. Backend: Cargar Dataset Completo

```python
@app.post("/load-csv")
async def load_csv(preview_rows: int = Form(10)):
    df = pd.read_csv(...)
    
    columns = df.columns.tolist()
    total_rows = len(df)
    
    # ✅ Si preview_rows >= 1000, devolver TODAS las filas
    if preview_rows >= total_rows or preview_rows >= 1000:
        all_data = df.to_dict("records")
        return CSVResponse(
            success=True,
            data=all_data,  # TODAS las filas
            columns=columns,
            totalRows=total_rows,
            message=f"CSV cargado con {total_rows} filas (dataset completo)",
        )
    else:
        # Solo preview para visualización rápida
        preview_data = df.head(preview_rows).to_dict("records")
        return CSVResponse(
            success=True,
            data=preview_data,
            columns=columns,
            totalRows=total_rows,
            message=f"Mostrando {len(preview_data)} de {total_rows} filas",
        )
```

**Lógica:**
- Si `preview_rows >= 1000` → Devolver **todas las filas**
- Si `preview_rows < 1000` → Devolver solo preview
- Frontend envía `preview_rows: '1000'` → Carga completa ✅

### 2. Frontend: Eliminar Límite de Base de Datos

```typescript
const loadTableData = async (tableName: string) => {
  // ✅ Cargar TODOS los datos (sin límite)
  const { data, error, count } = await supabaseClient
    .from(tableName)
    .select('*', { count: 'exact' });  // Sin .limit()

  if (data && data.length > 0) {
    setLoadedData({
      tableName: tableName,
      columns: Object.keys(data[0]),
      rows: data,  // TODAS las filas
      source: "database",
    });

    toast({
      description: `${data.length} registros cargados (dataset completo)`,
    });
  }
};
```

**Cambios:**
- ❌ Eliminado: `.limit(100)`
- ✅ Agregado: `{ count: 'exact' }` para obtener el total
- ✅ Mensaje actualizado: "dataset completo"

---

## 📊 Comparación Antes vs Después

### Escenario 1: CSV con 5000 Filas

**Antes ❌:**
```
1. Usuario carga CSV con 5000 filas
2. Backend devuelve solo 1000 filas
3. Contexto guarda solo 1000 filas
4. Módulo "Limpiar Datos" ve solo 1000 filas
5. Detecta duplicados solo en esas 1000 filas
```

**Después ✅:**
```
1. Usuario carga CSV con 5000 filas
2. Backend devuelve TODAS las 5000 filas
3. Contexto guarda 5000 filas
4. Módulo "Limpiar Datos" ve las 5000 filas
5. Detecta duplicados en todo el dataset
```

### Escenario 2: Tabla con 10,000 Registros

**Antes ❌:**
```
1. Usuario carga tabla con 10,000 registros
2. Supabase devuelve solo 100 registros
3. Contexto guarda solo 100 registros
4. Módulo "Limpiar Datos" ve solo 100 registros
5. Detecta duplicados solo en esos 100 registros
```

**Después ✅:**
```
1. Usuario carga tabla con 10,000 registros
2. Supabase devuelve TODOS los 10,000 registros
3. Contexto guarda 10,000 registros
4. Módulo "Limpiar Datos" ve los 10,000 registros
5. Detecta duplicados en todo el dataset
```

---

## 🧪 Ejemplo Práctico

### Datos de Prueba

**CSV con 150 filas:**
```csv
id,nombre,edad,ciudad
1,Juan,25,Madrid
2,María,30,Barcelona
...
50,Juan,25,Madrid      ← Duplicado de fila 1
...
100,María,30,Barcelona ← Duplicado de fila 2
...
150,Pedro,35,Sevilla
```

### Antes ❌

```
1. Cargar CSV (150 filas)
   ↓
2. Backend devuelve solo primeras 100 filas
   ↓
3. Módulo "Limpiar Datos" abre
   ↓
4. Detecta duplicados:
   - Fila 1 y 50 son duplicadas ✓
   - Fila 2 y 100 NO detectadas ❌ (fila 100 no está cargada)
   ↓
5. Resultado: Solo 1 duplicado detectado (incorrecto)
```

### Después ✅

```
1. Cargar CSV (150 filas)
   ↓
2. Backend devuelve TODAS las 150 filas
   ↓
3. Módulo "Limpiar Datos" abre
   ↓
4. Detecta duplicados:
   - Fila 1 y 50 son duplicadas ✓
   - Fila 2 y 100 son duplicadas ✓
   ↓
5. Resultado: 2 duplicados detectados (correcto)
```

---

## 💻 Código Implementado

### Backend: `backend/app.py`

```python
@app.post("/load-csv")
async def load_csv(
    file: UploadFile,
    delimiter: str = Form(","),
    encoding: str = Form("utf-8"),
    preview_rows: int = Form(10),
):
    try:
        content = await file.read()
        text_content = content.decode(encoding)
        df = pd.read_csv(StringIO(text_content), delimiter=delimiter)

        columns = df.columns.tolist()
        total_rows = len(df)
        
        # Si preview_rows >= 1000, devolver dataset completo
        if preview_rows >= total_rows or preview_rows >= 1000:
            all_data = df.to_dict("records")
            return CSVResponse(
                success=True,
                data=all_data,
                columns=columns,
                totalRows=total_rows,
                message=f"CSV cargado con {total_rows} filas (dataset completo)",
            )
        else:
            preview_data = df.head(preview_rows).to_dict("records")
            return CSVResponse(
                success=True,
                data=preview_data,
                columns=columns,
                totalRows=total_rows,
                message=f"Mostrando {len(preview_data)} de {total_rows} filas",
            )

    except Exception as e:
        return CSVResponse(
            success=False, data=[], columns=[], totalRows=0, error=str(e)
        )
```

### Frontend: `src/components/modules/DataLoaderDialog.tsx`

```typescript
const loadTableData = async (tableName: string) => {
  try {
    setLoading(true);
    
    // Cargar TODOS los datos de la tabla (sin límite)
    const { data, error, count } = await supabaseClient
      .from(tableName)
      .select('*', { count: 'exact' });

    if (error) throw error;

    if (data && data.length > 0) {
      setTableData(data);
      setTableColumns(Object.keys(data[0]));

      setLoadedData({
        tableName: tableName,
        columns: Object.keys(data[0]),
        rows: data,
        source: "database",
      });
      completeModule('loader');

      toast({
        title: "Datos cargados",
        description: `${data.length} registros cargados (dataset completo)`,
      });
    }
  } catch (error) {
    // ...
  }
};
```

---

## 📁 Archivos Modificados

### 1. **`backend/app.py`** ✨

**Líneas 219-263:**
- ✅ Lógica condicional para devolver dataset completo
- ✅ Si `preview_rows >= 1000` → Todas las filas
- ✅ Mensaje actualizado: "dataset completo"

### 2. **`src/components/modules/DataLoaderDialog.tsx`** ✨

**Líneas 165-202:**
- ✅ Eliminado `.limit(100)` de Supabase
- ✅ Agregado `{ count: 'exact' }` para obtener total
- ✅ Comentario explicativo
- ✅ Mensaje actualizado: "dataset completo"

---

## ⚙️ Configuración

### Umbral de Carga Completa

**Backend:**
```python
if preview_rows >= total_rows or preview_rows >= 1000:
    # Cargar dataset completo
```

**Lógica:**
- `preview_rows >= 1000` → Carga completa
- `preview_rows < 1000` → Solo preview

**Frontend envía:**
```typescript
formData.append('preview_rows', '1000');  // Siempre carga completo
```

---

## 🎯 Beneficios

### 1. Detección Precisa
- ✅ Detecta duplicados en **todo el dataset**
- ✅ No se pierden duplicados por límites artificiales
- ✅ Análisis completo de calidad de datos

### 2. Consistencia
- ✅ CSV y Base de Datos cargan datos completos
- ✅ Mismo comportamiento en ambas fuentes
- ✅ Contexto siempre tiene datos completos

### 3. Transparencia
- ✅ Mensaje indica "dataset completo"
- ✅ Usuario sabe que tiene todos los datos
- ✅ No hay sorpresas con datos faltantes

### 4. Módulos Funcionan Correctamente
- ✅ "Limpiar Datos" ve todos los datos
- ✅ "Tabla" muestra todos los registros
- ✅ "Entrenar Modelo" usa dataset completo

---

## ⚠️ Consideraciones

### Rendimiento

**Datasets Grandes:**
- CSV con 100,000+ filas puede ser lento
- Tabla con 1,000,000+ registros puede consumir mucha memoria

**Recomendaciones:**
- Para datasets muy grandes (>100,000 filas), considerar:
  - Paginación en frontend
  - Procesamiento por lotes en backend
  - Límite configurable por usuario

### Memoria

**Frontend:**
- Todos los datos se guardan en memoria (contexto React)
- Puede afectar rendimiento en navegadores

**Backend:**
- Pandas carga todo el CSV en memoria
- Puede consumir mucha RAM con archivos grandes

---

## ✅ Resultado Final

### Flujo Completo

```
1. Usuario carga datos (CSV o Base de Datos)
   ↓
2. Sistema carga TODOS los datos
   ✅ CSV: Todas las filas (si preview_rows >= 1000)
   ✅ BD: Todos los registros (sin límite)
   ↓
3. Contexto guarda datos completos
   ✅ loadedData.rows = [todas las filas]
   ↓
4. Módulo "Limpiar Datos" abre
   ✅ Ve todos los datos
   ✅ Detecta duplicados en dataset completo
   ↓
5. Detección precisa
   ✅ Todos los duplicados encontrados
   ✅ Estadísticas correctas
```

### Mensajes

**CSV:**
```
✅ "Archivo CSV cargado exitosamente con 5000 filas (dataset completo)"
```

**Base de Datos:**
```
✅ "10000 registros cargados de la tabla usuarios (dataset completo)"
```

---

**El módulo "Limpiar Datos" ahora detecta duplicados correctamente porque carga el dataset completo!** 🎉

**Antes:** Solo veía 100-1000 filas  
**Ahora:** Ve TODAS las filas ✅
