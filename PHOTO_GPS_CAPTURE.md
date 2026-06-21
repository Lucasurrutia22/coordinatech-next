# 📸 Captura de Foto + GPS en Orden de Trabajo

## ✨ Resumen de Cambios

Se agregó la capacidad de **capturar fotos en tiempo real con geolocalización automática** en la sección "Foto del trabajo realizado" de la orden de soporte. Ahora los técnicos pueden:

1. ✅ Abrir cámara en vivo desde el dispositivo
2. ✅ Capturar foto del trabajo realizado
3. ✅ Capturar automáticamente la ubicación GPS
4. ✅ Ver previewde la foto + coordenadas exactas
5. ✅ Opcionalmente visualizar la ubicación en Google Maps
6. ✅ Todo se guarda asociado a la orden de trabajo

---

## 🔧 Archivos Modificados / Creados

### ✨ NUEVOS ARCHIVOS

#### 1. [WorkPhotoCapture.tsx](src/components/WorkPhotoCapture.tsx)
**Componente React** para captura de foto + GPS

- **Props**:
  - `onPhotoCapture`: Callback cuando se captura foto
  - `onPhotoClear`: Callback cuando se limpia/reinicia

- **Estados**:
  - `idle` - Botón inicial de captura
  - `capturing` - Video en vivo de cámara
  - `preview` - Muestra foto + GPS capturados

- **Features**:
  - 📹 Video en vivo con acceso a cámara trasera
  - 📍 Captura GPS simultánea con precisión
  - 🗺️ Link a Google Maps con coordenadas
  - 🔄 Botón para retomar/reintentar
  - ⚠️ Manejo gracioso de errores de permisos

- **Estructura de Datos Capturados**:
```typescript
{
  photo: "data:image/jpeg;base64,...", // Foto en base64
  gps?: {
    lat: 10.123456,
    lng: -75.456789,
    accuracy: 10 // metros
  },
  timestamp: "2026-06-15T10:30:00.000Z"
}
```

#### 2. [migration_work_photo_gps.sql](supabase/migration_work_photo_gps.sql)
**Migración de BD** para almacenar fotos + GPS

- Agrega columna `work_photo` (JSONB) a tabla `work_orders`
- Crea índice para queries futuras
- Crea función helper `extract_work_photo_gps()` para extraer coordenadas
- Actualiza políticas RLS

---

### 📝 ARCHIVOS MODIFICADOS

#### 1. [orden-soporte/page.tsx](src/app/\(protected\)/tickets/\[id\]/orden-soporte/page.tsx)

**Cambios**:
```typescript
// ✨ IMPORT
import { WorkPhotoCapture } from "@/components/WorkPhotoCapture";

// ✨ STATE - Almacenar foto capturada
const [photoData, setPhotoData] = useState<{
  photo: string;
  gps?: { lat: number; lng: number; accuracy?: number };
  timestamp: string;
} | null>(null);

// ✨ FORM - Reemplazó input file por componente
<label className="full">
  Foto del trabajo realizado
  <div style={{ marginTop: "0.25rem" }}>
    <WorkPhotoCapture
      onPhotoCapture={setPhotoData}
      onPhotoClear={() => setPhotoData(null)}
    />
  </div>
</label>

// ✨ ORDER DATA - Incluir foto + GPS
const orderData = {
  // ... otros campos ...
  ...(photoData && {
    work_photo: {
      photo: photoData.photo,
      gps: photoData.gps,
      timestamp: photoData.timestamp,
    }
  })
};
```

#### 2. [domain.ts](src/types/domain.ts)

**Cambios - Interfaz WorkOrder**:
```typescript
export interface WorkOrder {
  // ... campos existentes ...
  
  // ✨ NUEVO: Foto del trabajo realizado con ubicación GPS
  work_photo?: {
    photo: string; // base64 data URL
    gps?: {
      lat: number;
      lng: number;
      accuracy?: number;
    };
    timestamp: string; // ISO 8601
  };
}
```

---

## 🎯 Flujo de Uso

### Para Técnico:

1. **Completa orden de trabajo** → Llega a sección "Foto del trabajo realizado"
2. **Presiona "📸 Capturar foto en vivo"** → Se abre cámara del dispositivo
3. **Posiciona cámara** → Ve preview en vivo del trabajo
4. **Presiona "✓ Capturar"** → 
   - Captura foto
   - Automáticamente obtiene GPS
   - Muestra preview con datos
5. **Revisa datos**:
   - ✓ Foto del trabajo
   - ✓ Hora exacta
   - ✓ Latitud / Longitud
   - ✓ Precisión (±metros)
   - ✓ Link a Google Maps
6. **Presiona "Enviar orden"** → Foto + GPS se guardan en BD

### Alternativa si no tiene cámara:
- Puede presionar "Cancelar" y no adjuntar foto (es opcional)

---

## 📊 Datos Almacenados en Supabase

**Tabla**: `work_orders`

```sql
-- Después de ejecutar migración
{
  "id": "ORD-12345",
  "ticket_id": "ST-001",
  "tech_name": "Juan Pérez",
  "cliente_nombre": "Cliente XYZ",
  ...
  "work_photo": {
    "photo": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA...",
    "gps": {
      "lat": 4.710989,
      "lng": -74.0141,
      "accuracy": 8
    },
    "timestamp": "2026-06-15T10:30:45.000Z"
  }
}
```

---

## 🔐 Permisos Requeridos

El navegador solicitará permisos al usuario:

1. **Cámara** - Para capturar video en vivo
   - Usuario debe permitir acceso
   - Típicamente aparece popup en navegador

2. **Ubicación (GPS)** - Para coordenadas
   - Usuario debe permitir acceso
   - Si rechaza: foto se captura sin GPS (con advertencia)

### Nota:
- HTTPS requerido para acceso a cámara/GPS (excepto localhost)
- localhost funciona sin HTTPS en desarrollo

---

## 🛠️ Validación & Testing

### Checkpoints para verificar:

✅ **Componente importa correctamente**
```bash
npm run dev
# Navega a: http://localhost:3000/tickets/[ID]/orden-soporte
```

✅ **Botón aparece**: "📸 Capturar foto en vivo"

✅ **Cámara se abre**: Video preview en vivo

✅ **Captura funciona**: Click en "✓ Capturar"

✅ **GPS captura**: Muestra coordenadas o advertencia

✅ **Google Maps link**: Funciona el enlace ↗

✅ **Foto se guarda**: Enviar orden, verificar en BD

### Query en Supabase para verificar:
```sql
SELECT id, work_photo FROM work_orders 
WHERE work_photo IS NOT NULL 
ORDER BY submitted_at DESC 
LIMIT 5;
```

---

## 📋 Próximos Pasos

### 1. **Ejecutar Migración SQL** (REQUERIDO)
```sql
-- Copiar contenido de:
-- /supabase/migration_work_photo_gps.sql
-- Ejecutar en: https://app.supabase.com → SQL Editor
```

### 2. **Compilar y Validar**
```bash
npm run dev
# Navegar a orden de soporte y probar captura
```

### 3. **Opcional - Dashboard de Fotos**
Crear vista para admin que:
- Muestre todas las fotos capturadas
- Filtrar por técnico/fecha/ubicación
- Expandir foto + ver en mapa

### 4. **Opcional - Reportes con Ubicación**
Agregar a reportes:
- Mapa de calor de ubicaciones
- Rutas del técnico
- Estadísticas por zona geográfica

---

## 💾 Retrocompatibilidad

- ✅ Orden de trabajo SIN foto: `work_photo` = `undefined`
- ✅ Campo es completamente opcional
- ✅ No afecta órdenes anteriores
- ✅ No requiere cambios en Zoho

---

## 🐛 Troubleshooting

| Problema | Causa | Solución |
|----------|-------|----------|
| "No se pudo acceder a la cámara" | Navegador bloqueó permisos | Revisar permisos en navegador |
| GPS no aparece | Ubicación denegada | Usar GPS de navegador (Settings) |
| Foto no se guarda | Redux/BD sin ejecutar migración | Ejecutar `migration_work_photo_gps.sql` |
| Página en blanco | Error de compilación | Revisar console (F12) |

---

## 📚 Referencias

- [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [MediaDevices getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [Nominatim Reverse Geocoding](https://nominatim.org/release-docs/latest/api/Reverse/)
- [Google Maps URL Scheme](https://developers.google.com/maps/documentation/urls/get-started)

---

**Creado**: 2026-06-15  
**Estado**: ✅ Listo para testing  
**Prioridad**: 🔴 Alta (Mejora producción)
