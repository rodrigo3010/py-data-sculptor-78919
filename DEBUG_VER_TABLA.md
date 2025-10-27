# Debug: Botón "Ver Tabla" en Modelos Guardados

## Mejoras Implementadas

### 1. **Copia Profunda del Dataset** 📋

Ahora se hace una copia profunda del dataset para evitar problemas de referencia:

```typescript
const datasetCopy = loadedData ? {
  tableName: loadedData.tableName,
  columns: [...loadedData.columns], // Copia del array
  rows: JSON.parse(JSON.stringify(loadedData.rows)), // Copia profunda
  totalRows: loadedData.rows.length
} : undefined;
```

**Ventaja**: Garantiza que el dataset se guarda correctamente sin referencias que puedan perderse.

### 2. **Logs de Debug Completos** 🔍

**Al guardar el modelo**:
```
💾 Guardando modelo con dataset:
   model_name: "Modelo 27/10/2025..."
   predictions: 50
   dataset: {
     tableName: "movies.csv",
     rows: 85,
     columns: 10,
     firstRow: { titulo: "Film 1", ... }
   }
✅ Modelo guardado con ID: 1
🔍 Verificación del modelo guardado:
   hasDataset: true
   datasetRows: 85
```

**Al cargar modelos**:
```
📊 Modelos cargados:
   - Modelo A: hasDataset: true, datasetRows: 85
```

**Al hacer click en "Ver Tabla"**:
```
🔍 Click en Ver Tabla:
   modelName: "Modelo 27/10/2025..."
   hasDataset: true
   datasetInfo: {
     tableName: "movies.csv",
     rows: 85,
     columns: 10,
     hasRows: true,
     rowsLength: 85
   }
```

**Al renderizar el diálogo**:
```
📊 DatasetViewDialog render:
   open: true
   hasDataset: true
   modelName: "Modelo 27/10/2025..."
✅ Dataset disponible:
   tableName: "movies.csv"
   columnsLength: 10
   rowsLength: 85
```

### 3. **Verificación Post-Guardado** ✅

Después de guardar, se verifica que el modelo se guardó correctamente:

```typescript
const modelId = await db.saveModel(savedModel);
const verifyModel = await db.getModel(modelId);
console.log("🔍 Verificación:", {
  hasDataset: !!verifyModel?.dataset,
  datasetRows: verifyModel?.dataset?.totalRows || 0
});
```

## Pasos para Verificar

### Paso 1: Entrenar un Nuevo Modelo

1. Carga datos (CSV o Supabase)
2. Limpia datos (opcional)
3. Entrena un modelo
4. **Guarda el modelo**

### Paso 2: Verificar Logs de Guardado

Abre la consola del navegador y busca:

```
💾 Guardando modelo con dataset:
   ...
   dataset: { tableName: "...", rows: X, columns: Y }
```

**Si ves `dataset: 'No dataset'`**:
- ❌ El problema está en el guardado
- Verifica que `loadedData` no sea null
- Verifica que `loadedData.rows` tenga datos

**Si ves el dataset correctamente**:
- ✅ El guardado está funcionando
- Continúa al siguiente paso

### Paso 3: Verificar Logs de Verificación

Busca en la consola:

```
✅ Modelo guardado con ID: X
🔍 Verificación del modelo guardado:
   hasDataset: true
   datasetRows: X
```

**Si `hasDataset: false`**:
- ❌ El modelo no se guardó correctamente en IndexedDB
- Puede ser un problema de serialización
- Verifica el tamaño del dataset (IndexedDB tiene límites)

**Si `hasDataset: true`**:
- ✅ El modelo se guardó correctamente
- Continúa al siguiente paso

### Paso 4: Verificar Logs de Carga

Ve a "Ver Modelos Guardados" y busca en la consola:

```
📊 Modelos cargados:
   - Modelo X: hasDataset: true, datasetRows: Y
```

**Si `hasDataset: false`**:
- ❌ El dataset no se cargó desde IndexedDB
- Puede ser un problema de deserialización
- Verifica la estructura del modelo guardado

**Si `hasDataset: true`**:
- ✅ El modelo se cargó correctamente
- El botón debería estar habilitado

### Paso 5: Verificar el Botón

El botón "Ver Tabla" debería:
- ✅ Estar habilitado (no gris)
- ✅ Mostrar badge con número de filas
- ✅ Responder al click

**Si el botón está deshabilitado**:
- ❌ `model.dataset` es undefined o null
- Revisa los logs de carga del paso 4

**Si el botón está habilitado**:
- ✅ Haz click y continúa al siguiente paso

### Paso 6: Verificar Click

Al hacer click, busca en la consola:

```
🔍 Click en Ver Tabla:
   modelName: "..."
   hasDataset: true
   datasetInfo: { ... }
```

**Si `hasDataset: false`**:
- ❌ El dataset se perdió entre la carga y el click
- Problema de estado de React

**Si `hasDataset: true`**:
- ✅ El dataset está disponible
- El diálogo debería abrirse

### Paso 7: Verificar Diálogo

Busca en la consola:

```
📊 DatasetViewDialog render:
   open: true
   hasDataset: true
✅ Dataset disponible:
   tableName: "..."
   columnsLength: X
   rowsLength: Y
```

**Si ves `⚠️ No hay dataset en el modelo`**:
- ❌ El dataset no llegó al componente
- Problema de props

**Si ves `✅ Dataset disponible`**:
- ✅ El diálogo debería mostrarse con la tabla

## Problemas Comunes

### Problema 1: Dataset muy grande

**Síntoma**: El modelo se guarda pero el dataset es undefined al cargar

**Causa**: IndexedDB tiene límites de tamaño (~50MB típico)

**Solución**:
```typescript
// Limitar el número de filas guardadas
const datasetCopy = loadedData ? {
  tableName: loadedData.tableName,
  columns: [...loadedData.columns],
  rows: loadedData.rows.slice(0, 1000), // Solo primeras 1000 filas
  totalRows: loadedData.rows.length
} : undefined;
```

### Problema 2: Modelos antiguos

**Síntoma**: Modelos guardados antes de esta actualización no tienen dataset

**Causa**: El campo `dataset` no existía antes

**Solución**: Entrena y guarda nuevos modelos

### Problema 3: Serialización fallida

**Síntoma**: Error al guardar o cargar el modelo

**Causa**: Datos no serializables (funciones, símbolos, etc.)

**Solución**: La copia profunda con `JSON.parse(JSON.stringify())` resuelve esto

## Comandos de Debug en Consola

### Ver todos los modelos guardados
```javascript
const db = await indexedDB.open('MLPredictionsDB', 2);
// Luego inspecciona en DevTools → Application → IndexedDB
```

### Verificar un modelo específico
```javascript
// En la consola del navegador
const { db } = await import('./src/lib/indexeddb');
await db.init();
const models = await db.getModels();
console.log(models.map(m => ({
  name: m.model_name,
  hasDataset: !!m.dataset,
  datasetRows: m.dataset?.totalRows || 0
})));
```

### Limpiar todos los modelos
```javascript
const { db } = await import('./src/lib/indexeddb');
await db.init();
await db.clearAll();
console.log("✅ Todos los modelos eliminados");
```

## Checklist de Verificación

Después de entrenar y guardar un nuevo modelo:

- [ ] Log: "💾 Guardando modelo con dataset" muestra el dataset
- [ ] Log: "✅ Modelo guardado con ID: X"
- [ ] Log: "🔍 Verificación" muestra hasDataset: true
- [ ] Log: "📊 Modelos cargados" muestra hasDataset: true
- [ ] Botón "Ver Tabla" está habilitado (no gris)
- [ ] Botón muestra badge con número de filas
- [ ] Log: "🔍 Click en Ver Tabla" muestra hasDataset: true
- [ ] Log: "📊 DatasetViewDialog render" muestra open: true
- [ ] Log: "✅ Dataset disponible" muestra los datos
- [ ] Diálogo se abre mostrando la tabla

## Solución Rápida

Si el botón sigue sin funcionar después de todas las verificaciones:

1. **Elimina todos los modelos antiguos**:
   - Ve a "Ver Modelos Guardados"
   - Elimina todos los modelos existentes

2. **Entrena un nuevo modelo**:
   - Carga datos
   - Limpia datos (opcional)
   - Entrena modelo
   - Guarda modelo

3. **Verifica los logs**:
   - Sigue el checklist de arriba
   - Todos los logs deberían mostrar datos correctos

4. **Prueba el botón**:
   - Debería estar habilitado
   - Debería abrir el diálogo con la tabla

## Conclusión

Con las mejoras implementadas:
- ✅ Copia profunda del dataset
- ✅ Logs detallados en cada paso
- ✅ Verificación post-guardado
- ✅ Debug completo del flujo

El botón "Ver Tabla" debería funcionar correctamente para todos los modelos nuevos guardados después de esta actualización.
