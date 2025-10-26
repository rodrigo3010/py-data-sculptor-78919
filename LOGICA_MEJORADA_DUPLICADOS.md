# Lógica Mejorada: Detección de Duplicados Ignorando IDs

## 🎯 Cambio Implementado

La detección de duplicados ahora **ignora automáticamente columnas de ID** y se enfoca en los datos reales. Esto permite detectar filas con los mismos datos aunque tengan IDs diferentes.

---

## 📊 Problema Anterior

### Antes ❌

```csv
id,nombre,edad,ciudad
1,Juan,25,Madrid
2,María,30,Barcelona
3,Juan,25,Madrid      ← NO detectado como duplicado (ID diferente)
```

**Problema:** No detectaba duplicados porque el ID era diferente.

### Ahora ✅

```csv
id,nombre,edad,ciudad
1,Juan,25,Madrid
2,María,30,Barcelona
3,Juan,25,Madrid      ← DETECTADO como duplicado (ignora ID)
```

**Solución:** Ignora columnas de ID y compara solo los datos reales.

---

## 💡 Cómo Funciona

### 1. Identificar Columnas de ID

El sistema detecta automáticamente columnas que son IDs:

```python
# Backend (Python)
id_columns = []
for col in df.columns:
    col_lower = col.lower()
    # Detectar nombres comunes de ID
    if col_lower in ['id', '_id', 'index', 'row_id', 'pk'] or col_lower.endswith('_id'):
        # Verificar si es única (característica de un ID)
        if df[col].nunique() == len(df):
            id_columns.append(col)
```

**Columnas detectadas como ID:**
- `id`, `_id`, `index`, `row_id`, `pk`
- Cualquier columna que termine en `_id` (ej: `user_id`, `product_id`)
- Solo si todos los valores son únicos

### 2. Comparar Solo Datos Relevantes

```python
# Columnas a considerar (todas excepto IDs)
columns_to_check = [col for col in df.columns if col not in id_columns]

# Detectar duplicados basándose en columnas relevantes
df.duplicated(subset=columns_to_check, keep='first')
```

### 3. Eliminar Duplicados Manteniendo Primera Ocurrencia

```python
# Eliminar duplicados manteniendo la primera fila
df = df.drop_duplicates(subset=columns_to_check, keep='first')
```

---

## 📝 Ejemplos

### Ejemplo 1: Tabla con ID Autoincremental

**Datos de entrada:**
```csv
id,nombre,edad,ciudad,salario
1,Juan,25,Madrid,50000
2,María,30,Barcelona,60000
3,Juan,25,Madrid,50000      ← Duplicado (ignora ID)
4,Pedro,35,Sevilla,55000
5,María,30,Barcelona,60000   ← Duplicado (ignora ID)
```

**Detección:**
```
Columnas ID detectadas: [id]
Columnas a comparar: [nombre, edad, ciudad, salario]

Duplicados encontrados: 2
• Filas 1, 3 tienen los mismos datos (ignora ID)
• Filas 2, 5 tienen los mismos datos (ignora ID)
```

**Resultado después de limpiar:**
```csv
id,nombre,edad,ciudad,salario
1,Juan,25,Madrid,50000       ← Mantenida
2,María,30,Barcelona,60000    ← Mantenida
4,Pedro,35,Sevilla,55000      ← Mantenida

Mensaje: "Duplicados encontrados: 2 (ignorando columnas ID: id). 
          2 filas duplicadas eliminadas, manteniendo solo la primera ocurrencia"
```

### Ejemplo 2: Tabla con Múltiples IDs

**Datos de entrada:**
```csv
user_id,product_id,nombre,precio,stock
101,1,Laptop,1000,50
102,2,Mouse,20,100
103,3,Laptop,1000,50      ← Duplicado (ignora IDs)
104,4,Teclado,50,75
105,5,Mouse,20,100         ← Duplicado (ignora IDs)
```

**Detección:**
```
Columnas ID detectadas: [user_id, product_id]
Columnas a comparar: [nombre, precio, stock]

Duplicados encontrados: 2
• Filas 1, 3 tienen los mismos datos (nombre, precio, stock)
• Filas 2, 5 tienen los mismos datos (nombre, precio, stock)
```

**Resultado:**
```csv
user_id,product_id,nombre,precio,stock
101,1,Laptop,1000,50       ← Mantenida
102,2,Mouse,20,100         ← Mantenida
104,4,Teclado,50,75        ← Mantenida

Mensaje: "Duplicados encontrados: 2 (ignorando columnas ID: user_id, product_id). 
          2 filas duplicadas eliminadas"
```

### Ejemplo 3: Sin Columnas de ID

**Datos de entrada:**
```csv
nombre,edad,ciudad
Juan,25,Madrid
María,30,Barcelona
Juan,25,Madrid      ← Duplicado
```

**Detección:**
```
Columnas ID detectadas: []
Columnas a comparar: [nombre, edad, ciudad] (todas)

Duplicados encontrados: 1
• Filas 1, 3 son idénticas
```

**Resultado:**
```csv
nombre,edad,ciudad
Juan,25,Madrid      ← Mantenida
María,30,Barcelona  ← Mantenida

Mensaje: "Duplicados encontrados: 1. 1 fila duplicada eliminada"
```

---

## 💻 Implementación

### Backend (Python/Pandas)

```python
def clean_duplicates(df: pd.DataFrame, params: dict):
    """Eliminar filas duplicadas ignorando columnas de ID"""
    
    # 1. Identificar columnas de ID
    id_columns = []
    for col in df.columns:
        col_lower = col.lower()
        if col_lower in ['id', '_id', 'index', 'row_id', 'pk'] or col_lower.endswith('_id'):
            if df[col].nunique() == len(df):  # Verificar que sea única
                id_columns.append(col)
    
    # 2. Columnas a considerar (todas excepto IDs)
    columns_to_check = [col for col in df.columns if col not in id_columns]
    
    # 3. Detectar duplicados
    duplicates_to_remove = df.duplicated(subset=columns_to_check, keep='first').sum()
    
    # 4. Eliminar duplicados si está activado
    if remove_duplicates:
        df = df.drop_duplicates(subset=columns_to_check, keep='first')
    
    # 5. Mensaje informativo
    message = f"Duplicados encontrados: {duplicates_to_remove}"
    if id_columns:
        message += f" (ignorando columnas ID: {', '.join(id_columns)})"
    
    return df, message
```

### Frontend (TypeScript)

```typescript
const calculateDuplicates = () => {
  // 1. Identificar columnas de ID
  const idColumns = loadedData.columns.filter(col => {
    const colLower = col.toLowerCase();
    if (colLower === 'id' || colLower === '_id' || colLower === 'index' || 
        colLower === 'row_id' || colLower === 'pk' || colLower.endsWith('_id')) {
      // Verificar si es única
      const uniqueValues = new Set(loadedData.rows.map(r => r[col]));
      return uniqueValues.size === loadedData.rows.length;
    }
    return false;
  });
  
  // 2. Columnas a considerar (todas excepto IDs)
  const columnsToCheck = loadedData.columns.filter(col => !idColumns.includes(col));
  const finalColumns = columnsToCheck.length > 0 ? columnsToCheck : loadedData.columns;
  
  // 3. Detectar duplicados
  const seen = new Set();
  let duplicates = 0;
  
  loadedData.rows.forEach(row => {
    const rowKey = finalColumns
      .map(col => {
        const value = row[col];
        if (value === null || value === undefined || value === '') return 'NULL';
        if (typeof value === 'string') return value.trim().toLowerCase();
        return String(value);
      })
      .join('|');
    
    if (seen.has(rowKey)) {
      duplicates++;
    } else {
      seen.add(rowKey);
    }
  });
  
  return duplicates;
};
```

---

## 🔍 Casos de Uso

### Caso 1: Base de Datos con ID Autoincremental

**Escenario:** Un sistema insertó el mismo registro múltiples veces con diferentes IDs.

```csv
id,usuario,email,fecha_registro
1,juan@email.com,Juan,2024-01-01
2,maria@email.com,María,2024-01-02
3,juan@email.com,Juan,2024-01-01  ← Duplicado
```

**Resultado:** Detecta fila 3 como duplicado de fila 1 (ignora ID).

### Caso 2: Importación de CSV con IDs Diferentes

**Escenario:** Dos CSVs con los mismos datos pero IDs diferentes fueron combinados.

```csv
product_id,nombre,precio,categoria
A001,Laptop,1000,Electrónica
B002,Mouse,20,Accesorios
C003,Laptop,1000,Electrónica  ← Duplicado
```

**Resultado:** Detecta fila 3 como duplicado de fila 1 (ignora product_id).

### Caso 3: Tabla sin IDs

**Escenario:** Datos sin columnas de ID.

```csv
nombre,edad,ciudad
Juan,25,Madrid
Juan,25,Madrid  ← Duplicado
```

**Resultado:** Detecta duplicado comparando todas las columnas.

---

## ⚙️ Configuración

### Columnas Detectadas Automáticamente como ID

| Nombre | Detectado |
|--------|-----------|
| `id` | ✅ |
| `_id` | ✅ |
| `index` | ✅ |
| `row_id` | ✅ |
| `pk` | ✅ |
| `user_id` | ✅ |
| `product_id` | ✅ |
| `*_id` | ✅ |
| `nombre` | ❌ |
| `email` | ❌ |

### Condiciones para ser ID

1. **Nombre:** Debe ser uno de los nombres comunes de ID
2. **Unicidad:** Todos los valores deben ser únicos (sin duplicados)

---

## 📊 Comparación

### Estrategia Anterior

```
Compara: TODAS las columnas (incluyendo ID)
Resultado: No detecta duplicados si ID es diferente
```

**Ejemplo:**
```csv
id,nombre,edad
1,Juan,25
2,Juan,25  ← NO detectado (ID diferente)
```

### Estrategia Nueva ✅

```
Compara: Solo columnas de datos (ignora ID)
Resultado: Detecta duplicados aunque ID sea diferente
```

**Ejemplo:**
```csv
id,nombre,edad
1,Juan,25
2,Juan,25  ← DETECTADO (ignora ID)
```

---

## ✅ Beneficios

1. **Más Inteligente** - Ignora automáticamente columnas de ID
2. **Más Preciso** - Detecta duplicados reales en los datos
3. **Más Flexible** - Funciona con o sin columnas de ID
4. **Más Claro** - Mensaje indica qué columnas se ignoraron
5. **Automático** - No requiere configuración manual

---

## 🎯 Resultado Final

### Flujo Completo

```
1. Usuario carga datos con columna ID
   ↓
2. Sistema detecta columnas de ID automáticamente
   ✅ "Columnas ID detectadas: [id, user_id]"
   ↓
3. Compara solo columnas de datos
   ✅ Ignora: id, user_id
   ✅ Compara: nombre, edad, ciudad, email
   ↓
4. Detecta duplicados
   ✅ "5 filas duplicadas (ignorando columnas ID: id, user_id)"
   ↓
5. Usuario elimina duplicados
   ↓
6. Sistema mantiene primera ocurrencia
   ✅ Mantiene filas: 1, 2, 4, 6
   ❌ Elimina filas: 3, 5, 7, 8, 9
   ↓
7. Resultado final
   ✅ "5 filas duplicadas eliminadas, manteniendo solo la primera ocurrencia"
```

---

**La detección de duplicados ahora es más inteligente: ignora IDs y detecta datos reales duplicados!** 🎉

**Ejemplo:**
```
Antes: id=1, Juan, 25 ≠ id=3, Juan, 25 (no duplicado)
Ahora: id=1, Juan, 25 = id=3, Juan, 25 (duplicado, ignora ID)
```
