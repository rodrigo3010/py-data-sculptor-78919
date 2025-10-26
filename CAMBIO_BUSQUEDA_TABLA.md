# Cambio de Filtros a Barra de Búsqueda Global

## 🎯 Cambio Realizado

Se ha reemplazado el sistema de filtros por columna con una **barra de búsqueda global** que busca en todas las columnas simultáneamente y resalta las coincidencias.

---

## 📊 Comparación Antes vs Después

### Antes ❌

```
┌────────────────────────────────────────────┐
│  Filtros                                   │
├────────────────────────────────────────────┤
│  [nombre]  [edad]  [ciudad]  [salario]    │
│  ▼ Input   ▼ Input ▼ Input   ▼ Input      │
│                                            │
│  (4 campos de filtro separados)           │
└────────────────────────────────────────────┘
```

**Problemas:**
- ❌ Muchos campos de entrada
- ❌ Confuso para el usuario
- ❌ Ocupa mucho espacio
- ❌ Difícil de usar en móviles

### Después ✅

```
┌────────────────────────────────────────────┐
│  🔍 [Buscar en todas las columnas...]     │
│     [Limpiar]                              │
│                                            │
│  Mostrando 5 coincidencias de "Juan"      │
└────────────────────────────────────────────┘
```

**Ventajas:**
- ✅ Un solo campo de búsqueda
- ✅ Busca en todas las columnas
- ✅ Resalta coincidencias
- ✅ Más intuitivo
- ✅ Mejor en móviles

---

## 🔍 Características Implementadas

### 1. Búsqueda Global

**Busca en todas las columnas simultáneamente:**

```typescript
const filteredRows = useMemo(() => {
  if (!searchQuery.trim()) return rows;
  
  const query = searchQuery.toLowerCase().trim();
  
  return rows.filter((row) => {
    // Buscar en TODAS las columnas
    return columns.some((column) => {
      const cellValue = String(row[column] ?? "").toLowerCase();
      return cellValue.includes(query);
    });
  });
}, [rows, columns, searchQuery]);
```

**Ejemplo:**
```
Búsqueda: "Juan"

Encuentra en:
- Columna "nombre": "Juan Pérez" ✓
- Columna "email": "juan@email.com" ✓
- Columna "ciudad": "San Juan" ✓
```

### 2. Resaltado de Coincidencias

**Las coincidencias se resaltan en amarillo:**

```typescript
const highlightMatch = (text: string, query: string) => {
  if (!query) return text;
  
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, index) => 
    part.toLowerCase() === query.toLowerCase() 
      ? <mark className="bg-yellow-300 dark:bg-yellow-600">{part}</mark>
      : part
  );
};
```

**Resultado visual:**
```
Juan Pérez → [Juan] Pérez  (Juan resaltado en amarillo)
juan@email.com → [juan]@email.com
San Juan → San [Juan]
```

### 3. Contador de Coincidencias

**Muestra cuántas filas coinciden:**

```typescript
{searchQuery && (
  <p className="text-sm text-muted-foreground mt-2">
    Mostrando {filteredRows.length} coincidencia{filteredRows.length !== 1 ? 's' : ''} de "{searchQuery}"
  </p>
)}
```

**Ejemplos:**
- `Mostrando 1 coincidencia de "María"`
- `Mostrando 5 coincidencias de "Madrid"`
- `Mostrando 0 coincidencias de "xyz"`

### 4. Botón Limpiar

**Aparece solo cuando hay búsqueda activa:**

```typescript
{searchQuery && (
  <Button
    variant="outline"
    onClick={() => setSearchQuery("")}
  >
    Limpiar
  </Button>
)}
```

### 5. Búsqueda Case-Insensitive

**Ignora mayúsculas/minúsculas:**

```
Búsqueda: "juan"

Encuentra:
- "Juan" ✓
- "JUAN" ✓
- "juan" ✓
- "JuAn" ✓
```

### 6. Trim Automático

**Ignora espacios al inicio y final:**

```
Búsqueda: "  Madrid  "
Se busca: "Madrid"
```

---

## 🎨 Interfaz de Usuario

### Barra de Búsqueda

```tsx
<div className="bg-card rounded-lg p-4 shadow-card">
  <div className="flex items-center gap-3">
    {/* Icono de búsqueda */}
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" />
      <Input
        placeholder="Buscar en todas las columnas..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-10 text-base"
      />
    </div>
    
    {/* Botón limpiar (solo si hay búsqueda) */}
    {searchQuery && (
      <Button variant="outline" onClick={() => setSearchQuery("")}>
        Limpiar
      </Button>
    )}
  </div>
  
  {/* Contador de coincidencias */}
  {searchQuery && (
    <p className="text-sm text-muted-foreground mt-2">
      Mostrando {filteredRows.length} coincidencias de "{searchQuery}"
    </p>
  )}
</div>
```

### Tabla con Resaltado

```tsx
<TableCell>
  {searchQuery 
    ? highlightMatch(cellValue, searchQuery.trim()) 
    : cellValue
  }
</TableCell>
```

---

## 📝 Ejemplos de Uso

### Ejemplo 1: Buscar por Nombre

**Datos:**
```
| id | nombre        | edad | ciudad    |
|----|---------------|------|-----------|
| 1  | Juan Pérez    | 25   | Madrid    |
| 2  | María García  | 30   | Barcelona |
| 3  | Juan López    | 35   | Sevilla   |
```

**Búsqueda:** `"Juan"`

**Resultado:**
```
| id | nombre        | edad | ciudad    |
|----|---------------|------|-----------|
| 1  | [Juan] Pérez  | 25   | Madrid    |  ← Resaltado
| 3  | [Juan] López  | 35   | Sevilla   |  ← Resaltado

Mostrando 2 coincidencias de "Juan"
```

### Ejemplo 2: Buscar por Ciudad

**Búsqueda:** `"Madrid"`

**Resultado:**
```
| id | nombre        | edad | ciudad      |
|----|---------------|------|-------------|
| 1  | Juan Pérez    | 25   | [Madrid]    |  ← Resaltado

Mostrando 1 coincidencia de "Madrid"
```

### Ejemplo 3: Buscar en Múltiples Columnas

**Datos:**
```
| id | nombre     | email              | ciudad   |
|----|------------|--------------------|----------|
| 1  | Ana López  | ana@email.com      | Madrid   |
| 2  | Juan Ana   | juan@email.com     | Barcelona|
| 3  | Pedro Ruiz | pedro@ana.com      | Sevilla  |
```

**Búsqueda:** `"ana"`

**Resultado:**
```
| id | nombre      | email              | ciudad   |
|----|-------------|--------------------|----------|
| 1  | [Ana] López | [ana]@email.com    | Madrid   |  ← 2 coincidencias
| 2  | Juan [Ana]  | juan@email.com     | Barcelona|  ← 1 coincidencia
| 3  | Pedro Ruiz  | pedro@[ana].com    | Sevilla  |  ← 1 coincidencia

Mostrando 3 coincidencias de "ana"
```

### Ejemplo 4: Sin Resultados

**Búsqueda:** `"xyz"`

**Resultado:**
```
┌────────────────────────────────────────┐
│  No se encontraron resultados para     │
│  "xyz"                                 │
└────────────────────────────────────────┘
```

---

## 🚀 Ventajas del Nuevo Sistema

### 1. Simplicidad
- ✅ Un solo campo de búsqueda
- ✅ Más fácil de entender
- ✅ Menos clics para el usuario

### 2. Velocidad
- ✅ Búsqueda instantánea
- ✅ Resultados en tiempo real
- ✅ Optimizado con `useMemo`

### 3. Flexibilidad
- ✅ Busca en todas las columnas
- ✅ No necesitas saber en qué columna buscar
- ✅ Encuentra coincidencias parciales

### 4. Visual
- ✅ Resalta coincidencias en amarillo
- ✅ Fácil de ver qué coincidió
- ✅ Contador de resultados

### 5. Responsive
- ✅ Funciona bien en móviles
- ✅ Ocupa menos espacio
- ✅ Mejor experiencia táctil

---

## 💻 Código Completo

### Estado y Lógica

```typescript
const [searchQuery, setSearchQuery] = useState("");

// Filtrar filas
const filteredRows = useMemo(() => {
  if (!searchQuery.trim()) return rows;
  
  const query = searchQuery.toLowerCase().trim();
  
  return rows.filter((row) => {
    return columns.some((column) => {
      const cellValue = String(row[column] ?? "").toLowerCase();
      return cellValue.includes(query);
    });
  });
}, [rows, columns, searchQuery]);

// Resaltar coincidencias
const highlightMatch = (text: string, query: string) => {
  if (!query) return text;
  
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, index) => 
    part.toLowerCase() === query.toLowerCase() 
      ? <mark className="bg-yellow-300 dark:bg-yellow-600">{part}</mark>
      : part
  );
};
```

### UI

```tsx
{/* Barra de búsqueda */}
<div className="bg-card rounded-lg p-4 shadow-card">
  <div className="flex items-center gap-3">
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2" />
      <Input
        placeholder="Buscar en todas las columnas..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-10"
      />
    </div>
    {searchQuery && (
      <Button onClick={() => setSearchQuery("")}>Limpiar</Button>
    )}
  </div>
  {searchQuery && (
    <p>Mostrando {filteredRows.length} coincidencias</p>
  )}
</div>

{/* Tabla con resaltado */}
<TableCell>
  {searchQuery ? highlightMatch(cellValue, searchQuery) : cellValue}
</TableCell>
```

---

## 📁 Archivo Modificado

**`src/pages/TableView.tsx`** ✨

**Cambios principales:**

1. **Estado simplificado** (línea 12)
   ```typescript
   // Antes: const [filters, setFilters] = useState<Record<string, string>>({});
   // Después: const [searchQuery, setSearchQuery] = useState("");
   ```

2. **Nueva función de resaltado** (líneas 22-31)
   ```typescript
   const highlightMatch = (text: string, query: string) => { ... }
   ```

3. **Filtrado global** (líneas 34-46)
   ```typescript
   const filteredRows = useMemo(() => {
     // Busca en TODAS las columnas
     return columns.some((column) => { ... });
   });
   ```

4. **UI simplificada** (líneas 74-101)
   - Reemplazó grid de filtros con barra de búsqueda única
   - Agregó icono de búsqueda
   - Agregó botón "Limpiar"
   - Agregó contador de coincidencias

5. **Resaltado en tabla** (líneas 120-130)
   ```typescript
   {searchQuery ? highlightMatch(cellValue, searchQuery) : cellValue}
   ```

---

## 🎯 Casos de Uso

### Caso 1: Buscar Cliente
```
Usuario: Busca "García"
Sistema: Encuentra en nombre, apellido, email
Resultado: 3 coincidencias resaltadas
```

### Caso 2: Buscar Transacción
```
Usuario: Busca "2024"
Sistema: Encuentra en fecha, ID, referencia
Resultado: 150 coincidencias
```

### Caso 3: Buscar Email
```
Usuario: Busca "@gmail"
Sistema: Encuentra en columna email
Resultado: 25 coincidencias
```

### Caso 4: Buscar Número
```
Usuario: Busca "500"
Sistema: Encuentra en precio, cantidad, ID
Resultado: 8 coincidencias
```

---

## ✅ Resultado Final

### Antes ❌
```
4 campos de filtro separados
Difícil de usar
Ocupa mucho espacio
No resalta coincidencias
```

### Después ✅
```
1 barra de búsqueda global
Busca en todas las columnas
Resalta coincidencias en amarillo
Contador de resultados
Botón limpiar
Más intuitivo y rápido
```

---

## 🎉 Beneficios Finales

1. **Más Simple** - Un solo campo en lugar de múltiples
2. **Más Rápido** - Búsqueda instantánea en todas las columnas
3. **Más Visual** - Resaltado de coincidencias
4. **Más Intuitivo** - Como buscadores web (Google, etc.)
5. **Mejor UX** - Contador de resultados y botón limpiar
6. **Responsive** - Funciona mejor en móviles

**La búsqueda en tablas ahora es más potente y fácil de usar!** 🚀
