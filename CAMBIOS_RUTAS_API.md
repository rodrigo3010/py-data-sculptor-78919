# Cambios en las Rutas de la API

## 📝 Resumen

Se han actualizado todas las rutas de la API para usar **rutas relativas** en lugar de URLs absolutas, mejorando la portabilidad y configuración del proyecto.

## 🔄 Cambios Realizados

### 1. ModelTrainerDialog.tsx

**Antes:**
```typescript
const API_URL = "http://161.132.54.35:5050";
const response = await axios.post(`${API_URL}/train-model`, requestData);
```

**Después:**
```typescript
const response = await axios.post("/train-model", requestData);
```

### 2. ResultsDialog.tsx

**Antes:**
```typescript
const API_URL = "http://161.132.54.35:5050";
const response = await axios.get(`${API_URL}/predictions?n_samples=10`);
const response = await axios.post(`${API_URL}/save-model?...`);
```

**Después:**
```typescript
const response = await axios.get("/predictions?n_samples=10");
const response = await axios.post(`/save-model?...`);
```

### 3. vite.config.ts

**Agregado proxy de Vite:**
```typescript
server: {
  // ... configuración existente
  proxy: {
    '/train-model': {
      target: 'http://localhost:5050',
      changeOrigin: true,
    },
    '/predictions': {
      target: 'http://localhost:5050',
      changeOrigin: true,
    },
    '/predict': {
      target: 'http://localhost:5050',
      changeOrigin: true,
    },
    '/save-model': {
      target: 'http://localhost:5050',
      changeOrigin: true,
    },
  },
}
```

## ✅ Beneficios

1. **Portabilidad:** No hay IPs hardcodeadas en el código
2. **Configuración centralizada:** El proxy se configura una sola vez en `vite.config.ts`
3. **Desarrollo local:** Funciona automáticamente con `localhost`
4. **Producción:** Fácil de configurar con variables de entorno
5. **CORS:** El proxy de Vite maneja automáticamente los problemas de CORS en desarrollo

## 🚀 Cómo Funciona

### En Desarrollo (npm run dev)

1. Frontend corre en `http://localhost:8080`
2. Backend corre en `http://localhost:5050`
3. Frontend hace petición a `/train-model`
4. Vite proxy intercepta y redirige a `http://localhost:5050/train-model`
5. Backend responde
6. Vite proxy devuelve la respuesta al frontend

### En Producción (npm run build)

Para producción, necesitarás configurar un proxy reverso (nginx, Apache, etc.) o usar variables de entorno:

**Opción 1: Proxy Reverso (nginx)**
```nginx
location /api/ {
    proxy_pass http://backend:5050/;
}
```

**Opción 2: Variables de Entorno**
```typescript
// Crear archivo src/config/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || '';
export const apiClient = axios.create({
  baseURL: API_BASE_URL
});
```

## 📋 Endpoints Afectados

- ✅ `POST /train-model` - Entrenar modelos
- ✅ `GET /predictions` - Obtener predicciones
- ✅ `POST /predict` - Hacer predicciones
- ✅ `POST /save-model` - Guardar modelos

## 🔧 Configuración Requerida

### Backend
El backend debe correr en `http://localhost:5050` (o configurar el proxy en vite.config.ts)

```bash
cd backend
python app.py
```

### Frontend
```bash
npm run dev
```

## 📝 Notas Importantes

1. **Desarrollo:** El proxy de Vite solo funciona con `npm run dev`, no con `npm run build`
2. **Puerto del backend:** Por defecto es `5050`, se puede cambiar en `vite.config.ts`
3. **CORS:** No es necesario configurar CORS en desarrollo gracias al proxy
4. **Producción:** Requiere configuración adicional (proxy reverso o variables de entorno)

## 🔍 Verificación

Para verificar que todo funciona:

1. Inicia el backend: `cd backend && python app.py`
2. Inicia el frontend: `npm run dev`
3. Abre el navegador en `http://localhost:8080`
4. Abre DevTools → Network
5. Entrena un modelo
6. Verifica que las peticiones van a `/train-model` (no a `http://161.132.54.35:5050/train-model`)

## 🎯 Próximos Pasos

Si necesitas configurar para producción:

1. **Opción A:** Usar nginx como proxy reverso
2. **Opción B:** Configurar variables de entorno con `VITE_API_URL`
3. **Opción C:** Servir frontend y backend desde el mismo dominio

## 📚 Referencias

- [Vite Proxy Configuration](https://vitejs.dev/config/server-options.html#server-proxy)
- [Axios Documentation](https://axios-http.com/docs/intro)
- [Environment Variables in Vite](https://vitejs.dev/guide/env-and-mode.html)
