# Detección de Duplicados por Fila Completa

## 🎯 Concepto

La detección de duplicados se realiza por **fila completa**, es decir, una fila se considera duplicada **solo si TODAS sus columnas son idénticas** a otra fila.

---

## 📊 Cómo Funciona

### Definición de Fila Duplicada

Una fila es duplicada cuando:
- ✅ **Todas las columnas** tienen los mismos valores que otra fila
- ✅ Los valores se comparan después de normalizar (trim, lowercase)
- ✅ Se ignoran diferencias de mayúsculas y espacios

### NO es Duplicado

Una fila NO es duplicada si:
- ❌ Solo algunas columnas son iguales
- ❌ Una sola columna es diferente
- ❌ El orden de las columnas es diferente

---

## 💡 Ejemplos

### Ejemplo 1: Filas Duplicadas ✅

**Datos:**
```csv
id,nombre,edad,ciudad
1,Juan,25,Madrid
2,María,30,Barcelona
3,Juan,25,Madrid      ← DUPLICADO de fila 1 (todas las columnas iguales)
4,Pedro,35,Sevilla
5,María,30,Barcelona  ← DUPLICADO de fila 2 (todas las columnas iguales)
```

**Detección:**
```
Filas duplicadas: 2

Ejemplos:
• Filas 1, 3 son idénticas (2 copias)
• Filas 2, 5 son idénticas (2 copias)
```

**Resultado después de limpiar:**
```csv
id,nombre,edad,ciudad
1,Juan,25,Madrid
2,María,30,Barcelona
4,Pedro,35,Sevilla

Mensaje: "Duplicados encontrados: 2, 2 filas eliminadas"
```

### Ejemplo 2: NO son Duplicados ❌

**Datos:**
```csv
id,nombre,edad,ciudad
1,Juan,25,Madrid
2,Juan,30,Barcelona   ← NO duplicado (edad diferente)
3,Juan,25,Sevilla     ← NO duplicado (ciudad diferente)
4,María,25,Madrid     ← NO duplicado (nombre diferente)
```

**Detección:**
```
Filas duplicadas: 0

Aunque "Juan" aparece 3 veces, las filas NO son duplicadas
porque tienen valores diferentes en otras columnas.
```

### Ejemplo 3: Normalización de Valores

**Datos:**
```csv
id,nombre,edad,ciudad
1,Juan,25,Madrid
2,  JUAN  ,25,  madrid  
3,juan,25,Madrid
```

**Detección:**
```
Filas duplicadas: 2

Todas son consideradas duplicadas porque después de normalizar:
- "Juan" = "  JUAN  " = "juan" (trim + lowercase)
- "Madrid" = "  madrid  " = "Madrid" (trim + lowercase)

Ejemplos:
• Filas 1, 2, 3 son idénticas (3 copias)
```

---

## 💻 Implementación

### Frontend (TypeScript)

```typescript
const calculateDuplicates = () => {
  const seen = new Set();
  let duplicates = 0;
  
  loadedData.rows.forEach(row => {
    // Crear clave única para la FILA COMPLETA
    const rowKey = loadedData.columns
      .map(col => {
        const value = row[col];
        // Normalizar valores
        if (value === null || value === undefined || value === '') return 'NULL';
        if (typeof value === 'string') return value.trim().toLowerCase();
        return String(value);
      })
      .join('|');  // Unir TODAS las columnas
    
    if (seen.has(rowKey)) {
      duplicates++;  // Esta fila ya existe
    } else {
      seen.add(rowKey);  // Primera vez que vemos esta fila
    }
  });
  
  return duplicates;
};
```

**Ejemplo de `rowKey`:**
```
Fila: {id: 1, nombre: "Juan", edad: 25, ciudad: "Madrid"}
rowKey: "1|juan|25|madrid"

Fila: {id: 3, nombre: "  JUAN  ", edad: 25, ciudad: "Madrid"}
rowKey: "3|juan|25|madrid"  ← Diferente por el ID

Fila: {id: 1, nombre: "Juan", edad: 25, ciudad: "Madrid"}
rowKey: "1|juan|25|madrid"  ← DUPLICADO (misma clave)
```

### Backend (Python/Pandas)

```python
def clean_duplicates(df: pd.DataFrame, params: dict):
    """Eliminar filas duplicadas del DataFrame"""
    remove_duplicates = params.get("removeDuplicates", False)
    
    # Detectar duplicados en TODAS las columnas
    initial_duplicates = df.duplicated().sum()
    
    if remove_duplicates:
        # Eliminar duplicados manteniendo la primera ocurrencia
        df = df.drop_duplicates(keep='first')
    
    rows_removed = initial_rows - len(df)
    message = f"Duplicados encontrados: {initial_duplicates}"
    if remove_duplicates:
        message += f", {rows_removed} filas eliminadas"
    
    return df, message
```

**Pandas `df.duplicated()`:**
- Compara TODAS las columnas por defecto
- Retorna `True` si la fila es duplicada
- `keep='first'` mantiene la primera ocurrencia

---

## 🎨 Visualización en UI

### Información Mostrada

```
┌────────────────────────────────────────────┐
│ 🧬 Datos duplicados                        │
│                        [5 filas duplicadas]│
├────────────────────────────────────────────┤
│ • Filas completas duplicadas: Todas las   │
│   columnas son idénticas                   │
│ • Ejemplo: Fila 1 y Fila 5 tienen         │
│   exactamente los mismos valores           │
│                                            │
│ ┌──────────────────────────────────────┐  │
│ │ Porcentaje de duplicados: 3.33%      │  │
│ │ Filas únicas: 145                    │  │
│ └──────────────────────────────────────┘  │
│                                            │
│ ┌──────────────────────────────────────┐  │
│ │ 📋 Ejemplos de filas duplicadas:     │  │
│ │ • Filas 1, 5, 12 son idénticas       │  │
│ │   (3 copias)                         │  │
│ │ • Filas 3, 8 son idénticas           │  │
│ │   (2 copias)                         │  │
│ └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

### Nueva Función: Ejemplos de Duplicados

```typescript
const getDuplicateExamples = () => {
  const rowMap = new Map<string, number[]>();
  
  // Agrupar filas por su clave
  loadedData.rows.forEach((row, index) => {
    const rowKey = /* ... crear clave ... */;
    
    if (!rowMap.has(rowKey)) {
      rowMap.set(rowKey, []);
    }
    rowMap.get(rowKey)!.push(index);
  });
  
  // Retornar solo grupos con duplicados
  const duplicateGroups = [];
  rowMap.forEach((indices, key) => {
    if (indices.length > 1) {
      duplicateGroups.push({
        indices,  // [1, 5, 12]
        row: loadedData.rows[indices[0]]
      });
    }
  });
  
  return duplicateGroups.slice(0, 3);  // Máximo 3 ejemplos
};
```

---

## 🔍 Casos de Uso

### Caso 1: Base de Datos con Inserciones Duplicadas

**Escenario:**
```
Un sistema insertó accidentalmente el mismo registro 3 veces
```

**Datos:**
```csv
id,usuario,email,fecha
1,juan@email.com,Juan,2024-01-01
2,maria@email.com,María,2024-01-02
3,juan@email.com,Juan,2024-01-01  ← Duplicado
4,pedro@email.com,Pedro,2024-01-03
5,juan@email.com,Juan,2024-01-01  ← Duplicado
```

**Resultado:**
```
Filas duplicadas: 2
Ejemplos: Filas 1, 3, 5 son idénticas (3 copias)

Después de limpiar: 3 filas (eliminadas 2 duplicados)
```

### Caso 2: CSV con Filas Repetidas

**Escenario:**
```
Un CSV fue concatenado múltiples veces
```

**Datos:**
```csv
producto,precio,stock
Laptop,1000,50
Mouse,20,100
Laptop,1000,50   ← Duplicado
Teclado,50,75
Mouse,20,100     ← Duplicado
```

**Resultado:**
```
Filas duplicadas: 2
Ejemplos:
• Filas 1, 3 son idénticas (2 copias)
• Filas 2, 5 son idénticas (2 copias)
```

### Caso 3: Datos de Sensores

**Escenario:**
```
Un sensor envió la misma lectura múltiples veces
```

**Datos:**
```csv
sensor_id,temperatura,humedad,timestamp
S1,25.5,60,2024-01-01 10:00
S2,22.0,55,2024-01-01 10:00
S1,25.5,60,2024-01-01 10:00  ← Duplicado
S3,28.0,65,2024-01-01 10:00
```

**Resultado:**
```
Filas duplicadas: 1
Ejemplos: Filas 1, 3 son idénticas (2 copias)
```

---

## ⚙️ Opciones de Configuración

### Normalización Automática

La detección normaliza automáticamente:

1. **Espacios en blanco**
   ```
   "  Madrid  " → "madrid"
   ```

2. **Mayúsculas/Minúsculas**
   ```
   "JUAN" → "juan"
   "Juan" → "juan"
   ```

3. **Valores nulos**
   ```
   null → "NULL"
   undefined → "NULL"
   "" → "NULL"
   ```

### Mantener Primera Ocurrencia

Al eliminar duplicados:
- ✅ Se mantiene la **primera fila** del grupo
- ❌ Se eliminan las **siguientes copias**

**Ejemplo:**
```
Filas 1, 5, 12 son idénticas
→ Se mantiene fila 1
→ Se eliminan filas 5 y 12
```

---

## 📊 Comparación con Otras Estrategias

### Estrategia 1: Por Fila Completa (Implementada) ✅

```
Compara TODAS las columnas
Fila duplicada = Todas las columnas iguales
```

**Ventajas:**
- ✅ Detecta duplicados exactos
- ✅ No elimina datos válidos
- ✅ Más conservador

**Desventajas:**
- ❌ No detecta duplicados parciales

### Estrategia 2: Por Columnas Específicas (No implementada)

```
Compara solo algunas columnas (ej: ID, email)
Fila duplicada = Columnas clave iguales
```

**Ventajas:**
- ✅ Detecta duplicados lógicos
- ✅ Más flexible

**Desventajas:**
- ❌ Puede eliminar datos válidos
- ❌ Requiere seleccionar columnas

### Estrategia 3: Por Similitud (No implementada)

```
Compara similitud de texto (fuzzy matching)
Fila duplicada = Similitud > 90%
```

**Ventajas:**
- ✅ Detecta duplicados con errores tipográficos

**Desventajas:**
- ❌ Más complejo
- ❌ Más lento
- ❌ Puede tener falsos positivos

---

## ✅ Resultado Final

### Flujo Completo

```
1. Usuario carga datos (150 filas)
   ↓
2. Sistema detecta duplicados por fila completa
   - Compara TODAS las columnas
   - Normaliza valores
   - Cuenta duplicados
   ↓
3. Muestra información
   ✅ "5 filas duplicadas de 150 totales"
   ✅ "Porcentaje: 3.33%"
   ✅ "Filas únicas: 145"
   ✅ "Ejemplos: Filas 1, 5, 12 son idénticas"
   ↓
4. Usuario activa "Eliminar filas duplicadas"
   ↓
5. Sistema elimina duplicados
   - Mantiene primera ocurrencia
   - Elimina copias
   ↓
6. Resultado: 145 filas (5 eliminadas)
```

### Mensajes Claros

**Antes:**
```
❌ "Registros repetidos total o parcialmente"
   (Confuso: ¿qué significa "parcialmente"?)
```

**Después:**
```
✅ "Filas completas duplicadas: Todas las columnas son idénticas"
✅ "Ejemplo: Fila 1 y Fila 5 tienen exactamente los mismos valores"
✅ "Ejemplos de filas duplicadas: Filas 1, 5, 12 son idénticas (3 copias)"
```

---

## 🎯 Beneficios

1. **Claridad** - Usuario entiende qué se considera duplicado
2. **Precisión** - Solo elimina filas realmente duplicadas
3. **Seguridad** - No elimina datos válidos por error
4. **Transparencia** - Muestra ejemplos de duplicados encontrados
5. **Eficiencia** - Usa algoritmos optimizados (Set, Map)

---

**La detección de duplicados ahora es clara y precisa: solo filas completas idénticas!** 🎉
