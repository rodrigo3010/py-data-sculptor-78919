# Fix: Estadísticas de Duplicados en Módulo "Cargar Datos"

## 🎯 Problema Identificado

El módulo "Cargar Datos" mostraba estadísticas de los datos cargados (filas, columnas, nulos, duplicados, inconsistencias), pero la función `calculateDuplicates()` **no estaba usando la lógica mejorada** que ignora columnas de ID.

---

## 🐛 Problema

### Función Anterior

```typescript
const calculateDuplicates = (data: any[]) => {
  const seen = new Set();
  let duplicates = 0;
  
  data.forEach(row => {
    const rowString = JSON.stringify(row);  // ❌ Incluye TODAS las columnas (incluso ID)
    if (seen.has(rowString)) {
      duplicates++;
    } else {
      seen.add(rowString);
    }
  });
  
  return duplicates;
};
```

**Problemas:**
- ❌ Usa `JSON.stringify(row)` que incluye **todas las columnas**
- ❌ No ignora columnas de ID
- ❌ Detecta menos duplicados de los que realmente hay
- ❌ Inconsistente con el módulo "Limpiar Datos"

### Ejemplo del Problema

**Datos:**
```csv
id,nombre,edad,ciudad
1,Juan,25,Madrid
2,María,30,Barcelona
3,Juan,25,Madrid      ← Debería ser duplicado
```

**Detección anterior:**
```typescript
Fila 1: JSON.stringify({id: 1, nombre: "Juan", edad: 25, ciudad: "Madrid"})
       = '{"id":1,"nombre":"Juan","edad":25,"ciudad":"Madrid"}'

Fila 3: JSON.stringify({id: 3, nombre: "Juan", edad: 25, ciudad: "Madrid"})
       = '{"id":3,"nombre":"Juan","edad":25,"ciudad":"Madrid"}'

Resultado: NO son duplicados ❌ (ID diferente)
```

---

## ✅ Solución Implementada

### Nueva Función

```typescript
const calculateDuplicates = (data: any[], columns: string[]) => {
  if (!data || data.length === 0) return 0;
  
  // 1. Identificar columnas que probablemente son IDs (para ignorarlas)
  const idColumns = columns.filter(col => {
    const colLower = col.toLowerCase();
    if (colLower === 'id' || colLower === '_id' || colLower === 'index' || 
        colLower === 'row_id' || colLower === 'pk' || colLower.endsWith('_id')) {
      // Verificar si es única (característica de un ID)
      const uniqueValues = new Set(data.map(r => r[col]));
      return uniqueValues.size === data.length;
    }
    return false;
  });
  
  // 2. Columnas a considerar para duplicados (todas excepto IDs)
  const columnsToCheck = columns.filter(col => !idColumns.includes(col));
  const finalColumns = columnsToCheck.length > 0 ? columnsToCheck : columns;
  
  // 3. Detectar duplicados
  const seen = new Set();
  let duplicates = 0;
  
  data.forEach(row => {
    // Crear clave usando solo columnas relevantes
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

**Mejoras:**
- ✅ Ignora automáticamente columnas de ID
- ✅ Normaliza valores (trim, lowercase)
- ✅ Compara solo datos relevantes
- ✅ Consistente con módulo "Limpiar Datos"

### Actualización de Llamadas

**Antes:**
```typescript
<Badge variant="destructive">{calculateDuplicates(csvData)}</Badge>
<Badge variant="destructive">{calculateDuplicates(tableData)}</Badge>
```

**Después:**
```typescript
<Badge variant="destructive">{calculateDuplicates(csvData, csvColumns)}</Badge>
<Badge variant="destructive">{calculateDuplicates(tableData, tableColumns)}</Badge>
```

---

## 📊 Comparación

### Ejemplo: CSV con Duplicados

**Datos:**
```csv
id,nombre,edad,ciudad,salario
1,Juan,25,Madrid,50000
2,María,30,Barcelona,60000
3,Juan,25,Madrid,50000      ← Duplicado de fila 1
4,Pedro,35,Sevilla,55000
5,María,30,Barcelona,60000   ← Duplicado de fila 2
```

### Antes ❌

```
Módulo "Cargar Datos":
┌─────────────────────────────┐
│ Estadísticas del Dataset    │
├─────────────────────────────┤
│ Filas: 5                    │
│ Columnas: 5                 │
│ Nulos: 0                    │
│ Duplicados: 0               │  ← ❌ Incorrecto
│ Inconsistencias: 0          │
└─────────────────────────────┘

Razón: JSON.stringify incluye ID, por lo que no detecta duplicados
```

### Después ✅

```
Módulo "Cargar Datos":
┌─────────────────────────────┐
│ Estadísticas del Dataset    │
├─────────────────────────────┤
│ Filas: 5                    │
│ Columnas: 5                 │
│ Nulos: 0                    │
│ Duplicados: 2               │  ← ✅ Correcto
│ Inconsistencias: 0          │
└─────────────────────────────┘

Razón: Ignora columna ID y detecta duplicados correctamente
```

---

## 🧪 Ejemplos

### Ejemplo 1: CSV con ID Autoincremental

**Datos:**
```csv
id,producto,precio,stock
1,Laptop,1000,50
2,Mouse,20,100
3,Laptop,1000,50      ← Duplicado
4,Teclado,50,75
5,Mouse,20,100         ← Duplicado
```

**Detección:**
```
Columnas ID detectadas: [id]
Columnas a comparar: [producto, precio, stock]

Duplicados encontrados: 2
• Filas 1, 3 tienen los mismos datos
• Filas 2, 5 tienen los mismos datos
```

**Estadísticas mostradas:**
```
Filas: 5
Columnas: 4
Duplicados: 2 ✅
```

### Ejemplo 2: Tabla con Múltiples IDs

**Datos:**
```csv
user_id,order_id,producto,cantidad,total
101,1001,Laptop,1,1000
102,1002,Mouse,2,40
103,1003,Laptop,1,1000    ← Duplicado
104,1004,Teclado,1,50
```

**Detección:**
```
Columnas ID detectadas: [user_id, order_id]
Columnas a comparar: [producto, cantidad, total]

Duplicados encontrados: 1
• Filas 1, 3 tienen los mismos datos
```

**Estadísticas mostradas:**
```
Filas: 4
Columnas: 5
Duplicados: 1 ✅
```

### Ejemplo 3: Sin Columnas de ID

**Datos:**
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
```

**Estadísticas mostradas:**
```
Filas: 3
Columnas: 3
Duplicados: 1 ✅
```

---

## 🎨 Visualización en UI

### Módulo "Cargar Datos" - Tab CSV

```
┌────────────────────────────────────────────┐
│ 📊 Estadísticas del Dataset                │
├────────────────────────────────────────────┤
│ Filas: 150                    [150]        │
│ Columnas: 5                   [5]          │
│ Nulos: 12                     [12]         │
│ Duplicados: 8                 [8]  ← ✅    │
│ Inconsistencias: 5            [5]          │
└────────────────────────────────────────────┘

[Ver Tabla Completa]  [Continuar a Limpiar Datos]
```

### Módulo "Cargar Datos" - Tab Base de Datos

```
┌────────────────────────────────────────────┐
│ 📊 Estadísticas de la Tabla: usuarios      │
├────────────────────────────────────────────┤
│ Filas: 10,000                 [10,000]     │
│ Columnas: 8                   [8]          │
│ Nulos: 245                    [245]        │
│ Duplicados: 32                [32]  ← ✅   │
│ Inconsistencias: 18           [18]         │
└────────────────────────────────────────────┘

[Ver Tabla Completa]  [Continuar a Limpiar Datos]
```

---

## 💻 Código Implementado

### Archivo: `src/components/modules/DataLoaderDialog.tsx`

**Función actualizada (líneas 233-278):**
```typescript
const calculateDuplicates = (data: any[], columns: string[]) => {
  if (!data || data.length === 0) return 0;
  
  // Identificar columnas que probablemente son IDs (para ignorarlas)
  const idColumns = columns.filter(col => {
    const colLower = col.toLowerCase();
    if (colLower === 'id' || colLower === '_id' || colLower === 'index' || 
        colLower === 'row_id' || colLower === 'pk' || colLower.endsWith('_id')) {
      const uniqueValues = new Set(data.map(r => r[col]));
      return uniqueValues.size === data.length;
    }
    return false;
  });
  
  // Columnas a considerar para duplicados (todas excepto IDs)
  const columnsToCheck = columns.filter(col => !idColumns.includes(col));
  const finalColumns = columnsToCheck.length > 0 ? columnsToCheck : columns;
  
  const seen = new Set();
  let duplicates = 0;
  
  data.forEach(row => {
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

**Llamadas actualizadas:**

**CSV (línea 423):**
```typescript
<Badge variant="destructive">{calculateDuplicates(csvData, csvColumns)}</Badge>
```

**Base de Datos (línea 512):**
```typescript
<Badge variant="destructive">{calculateDuplicates(tableData, tableColumns)}</Badge>
```

---

## 📁 Archivos Modificados

### `src/components/modules/DataLoaderDialog.tsx` ✨

**Cambios:**

1. **Función `calculateDuplicates` actualizada** (líneas 233-278)
   - ✅ Ahora recibe `columns` como segundo parámetro
   - ✅ Detecta y ignora columnas de ID automáticamente
   - ✅ Normaliza valores para comparación
   - ✅ Usa misma lógica que módulo "Limpiar Datos"

2. **Llamadas actualizadas** (líneas 423, 512)
   - ✅ CSV: `calculateDuplicates(csvData, csvColumns)`
   - ✅ BD: `calculateDuplicates(tableData, tableColumns)`

---

## ✅ Beneficios

### 1. Consistencia
- ✅ Misma lógica en "Cargar Datos" y "Limpiar Datos"
- ✅ Estadísticas coinciden entre módulos
- ✅ Usuario ve información precisa

### 2. Precisión
- ✅ Detecta duplicados reales (ignora ID)
- ✅ No cuenta como duplicados filas con solo ID diferente
- ✅ Normaliza valores para mejor detección

### 3. Transparencia
- ✅ Usuario sabe cuántos duplicados hay antes de limpiar
- ✅ Puede decidir si necesita limpiar datos
- ✅ Estadísticas confiables

---

## 🎯 Resultado Final

### Flujo Completo

```
1. Usuario carga CSV/Tabla
   ↓
2. Sistema calcula estadísticas
   ✅ Filas totales
   ✅ Columnas totales
   ✅ Valores nulos
   ✅ Duplicados (ignorando ID) ← Corregido
   ✅ Inconsistencias
   ↓
3. Muestra estadísticas en UI
   ✅ "Duplicados: 8"
   ↓
4. Usuario ve información precisa
   ✅ Sabe que hay 8 filas duplicadas
   ↓
5. Usuario abre "Limpiar Datos"
   ✅ Ve los mismos 8 duplicados
   ✅ Consistencia entre módulos
```

### Comparación de Estadísticas

**Antes ❌:**
```
Módulo "Cargar Datos":    Duplicados: 0
Módulo "Limpiar Datos":   Duplicados: 8
                          ↑ Inconsistencia
```

**Después ✅:**
```
Módulo "Cargar Datos":    Duplicados: 8
Módulo "Limpiar Datos":   Duplicados: 8
                          ↑ Consistente
```

---

**Las estadísticas de duplicados en "Cargar Datos" ahora son precisas y consistentes!** 🎉

**Antes:** Detectaba 0 duplicados (incorrecto)  
**Ahora:** Detecta 8 duplicados (correcto) ✅
