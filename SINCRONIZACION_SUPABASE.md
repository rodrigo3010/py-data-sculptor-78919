# Sincronización Automática con Supabase

## ✅ Funcionalidad Implementada

Cuando limpias datos que provienen de Supabase, los cambios se sincronizan automáticamente con la base de datos.

## Flujo de Sincronización

### 1. **Cargar Datos desde Supabase**

```
Cargar Datos → Seleccionar tabla de Supabase → 100 filas cargadas
```

**Metadata guardada**:
```typescript
loadedData = {
  tableName: "movies",
  columns: ["titulo", "genero", ...],
  rows: [...], // 100 filas
  source: "database" // ← Indica que viene de Supabase
}
```

### 2. **Limpiar Datos**

```
Limpiar Datos → Eliminar nulos → 85 filas
```

**Backend detecta origen**:
```python
if source == "database" and table_name:
    # Actualizar Supabase automáticamente
    supabase.table(table_name).delete().execute()
    supabase.table(table_name).insert(cleaned_data).execute()
```

### 3. **Resultado**

```
✅ Datos limpiados localmente (85 filas)
✅ Supabase actualizado (85 filas)
✅ Sincronización completa
```

## Comportamiento por Origen

### Datos de Supabase (source: "database")

```
Cargar desde Supabase → Limpiar → ✅ Actualiza Supabase
```

**Logs**:
```
🔄 Actualizando tabla 'movies' en Supabase...
✅ Registros antiguos eliminados
✅ Insertados 85 registros
✅ Tabla 'movies' actualizada exitosamente con 85 filas
```

**Toast**:
```
"Datos procesados con Pandas. Dataset actualizado: 85 filas
✅ Datos actualizados en Supabase: tabla 'movies' (85 filas)"
```

### Datos de CSV (source: "csv")

```
Cargar desde CSV → Limpiar → ℹ️ NO actualiza Supabase
```

**Logs**:
```
ℹ️ Datos de CSV, no se actualiza Supabase
```

**Toast**:
```
"Datos procesados con Pandas. Dataset actualizado: 85 filas"
```

## Operaciones Soportadas

Todas las operaciones de limpieza sincronizan con Supabase:

### 1. **Eliminar Nulos** (missing)
```
100 filas → Eliminar nulos → 85 filas
✅ Supabase actualizado: 85 filas
```

### 2. **Eliminar Duplicados** (normalize)
```
85 filas → Eliminar duplicados → 80 filas
✅ Supabase actualizado: 80 filas
```

### 3. **Normalizar Texto** (transform)
```
80 filas → Normalizar texto → 80 filas (modificadas)
✅ Supabase actualizado: 80 filas
```

## Proceso de Actualización

### Paso 1: Eliminar Datos Antiguos
```python
supabase.table(table_name).delete().neq('id', 0).execute()
```

Elimina todos los registros existentes de la tabla.

### Paso 2: Insertar Datos Limpios
```python
# Procesar en lotes de 1000 registros
for batch in batches:
    supabase.table(table_name).insert(batch).execute()
```

Inserta los datos limpios en lotes para evitar límites de Supabase.

### Paso 3: Confirmar
```
✅ Tabla 'movies' actualizada exitosamente con 85 filas
```

## Ejemplo Completo

### Escenario: Limpiar tabla de películas en Supabase

**Paso 1: Cargar desde Supabase**
```
Tabla: movies
Filas: 100
Origen: database ✓
```

**Paso 2: Limpiar nulos**
```
Operación: Eliminar filas con nulos
Resultado: 85 filas
```

**Backend (logs)**:
```
🔄 Actualizando tabla 'movies' en Supabase...
✅ Registros antiguos eliminados
✅ Insertados 85 registros (batch 1)
✅ Tabla 'movies' actualizada exitosamente con 85 filas
```

**Frontend (toast)**:
```
"Datos procesados con Pandas. Dataset actualizado: 85 filas
✅ Datos actualizados en Supabase: tabla 'movies' (85 filas)"
```

**Paso 3: Verificar en Supabase**
```
SELECT COUNT(*) FROM movies;
-- Resultado: 85 (antes: 100)
```

**Paso 4: Entrenar modelo**
```
Entrenar con 85 filas limpias
✅ Modelo usa datos sincronizados con Supabase
```

## Ventajas

### 1. **Sincronización Automática** 🔄
- No requiere acciones manuales
- Se actualiza en cada operación de limpieza
- Mantiene consistencia entre local y Supabase

### 2. **Inteligente** 🧠
- Solo actualiza si los datos vienen de Supabase
- Respeta el origen de los datos (CSV vs Database)
- Procesa en lotes para datasets grandes

### 3. **Transparente** 👁️
- Logs detallados en consola
- Toast confirma la actualización
- Mensajes claros de éxito/error

### 4. **Robusto** 💪
- Maneja errores gracefully
- Continúa aunque falle la sincronización
- Procesa datasets grandes en lotes

## Manejo de Errores

### Error de Conexión
```
⚠️ No se pudo actualizar Supabase: Connection timeout
```

**Comportamiento**:
- Los datos se limpian localmente ✅
- Se muestra advertencia en toast
- El flujo continúa normalmente

### Error de Permisos
```
⚠️ No se pudo actualizar Supabase: Permission denied
```

**Solución**:
- Verificar permisos de la tabla en Supabase
- Asegurar que el API key tiene permisos de escritura

### Tabla No Existe
```
⚠️ No se pudo actualizar Supabase: Table not found
```

**Solución**:
- Verificar que la tabla existe en Supabase
- Crear la tabla si es necesario

## Limitaciones

### 1. **Tamaño de Lote**
- Supabase limita a ~1000 registros por request
- Solución: Procesamiento en lotes automático

### 2. **Tiempo de Procesamiento**
- Datasets muy grandes (>10,000 filas) pueden tardar
- Solución: Procesamiento asíncrono en lotes

### 3. **Conexión Requerida**
- Requiere conexión a internet
- Solución: Manejo de errores graceful

## Verificación

### Checklist de Verificación

**Después de limpiar datos de Supabase**:
- [ ] Toast muestra "✅ Datos actualizados en Supabase"
- [ ] Logs muestran "✅ Tabla actualizada exitosamente"
- [ ] Número de filas coincide en local y Supabase
- [ ] Datos limpios visibles en Supabase Dashboard

**Ejemplo de verificación**:
```sql
-- Antes de limpiar
SELECT COUNT(*) FROM movies; -- 100

-- Después de limpiar
SELECT COUNT(*) FROM movies; -- 85

-- Verificar que no hay nulos
SELECT COUNT(*) FROM movies WHERE genero IS NULL; -- 0
```

## Logs de Debug

### Backend (Python)
```
🔄 Actualizando tabla 'movies' en Supabase...
✅ Registros antiguos eliminados
✅ Insertados 85 registros (batch 1)
✅ Tabla 'movies' actualizada exitosamente con 85 filas
```

### Frontend (JavaScript)
```
✅ Datos limpiados y actualizados en contexto:
   - Filas antes: 100
   - Filas después: 85
   - Filas eliminadas: 15
```

## Comparación

### ❌ Antes (Sin Sincronización)

```
1. Cargar desde Supabase (100 filas)
2. Limpiar localmente (85 filas)
3. Supabase sigue con 100 filas ❌
4. Inconsistencia entre local y database
```

### ✅ Ahora (Con Sincronización)

```
1. Cargar desde Supabase (100 filas)
2. Limpiar localmente (85 filas)
3. Supabase actualizado automáticamente (85 filas) ✅
4. Consistencia total entre local y database
```

## Conclusión

La sincronización automática con Supabase garantiza que:
- ✅ Los datos limpios se reflejan en la base de datos
- ✅ Consistencia entre local y Supabase
- ✅ Proceso transparente y automático
- ✅ Manejo robusto de errores
- ✅ Soporte para datasets grandes

**Resultado**: Confianza total en que los datos están sincronizados en todo momento.
