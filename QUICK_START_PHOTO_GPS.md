# ⚡ INICIO RÁPIDO - Captura de Foto + GPS

## 📋 Lo que se agregó

Un **componente de cámara en vivo** que captura:
- 📸 Foto del trabajo realizado
- 📍 Ubicación GPS exacta (lat/lng/precisión)
- ⏰ Timestamp automático

---

## 🚀 Para activar (3 pasos):

### Paso 1: Ejecutar Migración SQL ✅
En [Supabase](https://app.supabase.com):
1. SQL Editor → Nuevo Query
2. Copiar contenido de:
   ```
   /supabase/migration_work_photo_gps.sql
   ```
3. Presionar "Run"

**Resultado esperado**:
```
✓ Successfully executed 1 statement
```

### Paso 2: Servidor ya está en ejecución ✅
Si está corriendo:
```bash
npm run dev
```

### Paso 3: Navegar y Probar ✅
1. Abre: http://localhost:3000
2. Login como técnico
3. Entra a cualquier ticket en "in_progress"
4. Presiona "Orden de Soporte"
5. **Desplázate a "Foto del trabajo realizado"**
6. Verás: **"📸 Capturar foto en vivo"** ← NUEVO

---

## 🎬 Test Rápido (5 minutos)

```
┌─────────────────────────────────────────┐
│  Orden de Soporte                       │
├─────────────────────────────────────────┤
│ [Formulario...]                         │
│                                         │
│ 📸 Foto del trabajo realizado           │
│ ┌─────────────────────────────────────┐ │
│ │  📸 Capturar foto en vivo         │ │ ← CLICK AQUÍ
│ │                                     │ │
│ │  La foto se capturará con          │ │
│ │  ubicación GPS automáticamente     │ │
│ └─────────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

### Click en "Capturar foto en vivo":
1. ✓ Browser pide permiso de cámara
2. ✓ Se abre video en vivo
3. ✓ Browser pide permiso de GPS (puede tardar)
4. ✓ Presiona "Capturar"

### Resultado:
```
✓ Foto capturada
✓ GPS: 4.71°N, 74.01°O
✓ Precisión: ±8m
✓ Ver en Google Maps ↗
```

---

## ✅ Validación Completa

| Aspecto | Verificar |
|---------|-----------|
| **Componente visible** | ¿Ves el botón "📸 Capturar foto en vivo"? |
| **Cámara abre** | ¿Se abre video preview? |
| **Foto captura** | ¿Aparece foto en preview? |
| **GPS funciona** | ¿Ves coordenadas (lat/lng)? |
| **Google Maps** | ¿El link "Ver en Google Maps" funciona? |
| **Se guarda en BD** | ¿Query en Supabase muestra `work_photo`? |

---

## 🔍 Verificar en Supabase (BD)

Después de capturar + guardar orden:

```sql
-- En Supabase → SQL Editor
SELECT 
  id,
  tech_name,
  (work_photo->>'timestamp') as foto_hora,
  (work_photo->'gps'->>'lat')::float as latitud,
  (work_photo->'gps'->>'lng')::float as longitud
FROM public.work_orders
WHERE work_photo IS NOT NULL
ORDER BY submitted_at DESC
LIMIT 1;
```

**Resultado esperado**:
```
id           | tech_name  | foto_hora                | latitud  | longitud
─────────────────────────────────────────────────────────────────────────
ORD-12345    | Juan Pérez | 2026-06-15T10:30:00Z    | 4.710989 | -74.0141
```

---

## ⚠️ Troubleshooting Rápido

### "No se pudo acceder a la cámara"
```
❌ Problema: Permisos bloqueados
✅ Solución: 
   1. Chrome: Settings → Privacy → Camera
   2. Permitir localhost:3000
   3. Recargar página
```

### "GPS no captura"
```
❌ Problema: Ubicación no disponible
✅ Solución:
   1. Verifica que permiso de ubicación esté permitido
   2. En Chrome: Settings → Privacy → Location
   3. Permiso debe estar en "Allow" para localhost
   4. Si es Windows: Verifica que Windows Geolocation esté activo
```

### "La foto no se guarda"
```
❌ Problema: Migración SQL no ejecutada
✅ Solución:
   1. Ve a Supabase SQL Editor
   2. Ejecuta: migration_work_photo_gps.sql
   3. Reinicia servidor (npm run dev)
```

---

## 📊 Estadísticas

**Archivos agregados**: 3
- `WorkPhotoCapture.tsx` - Componente (350 líneas)
- `migration_work_photo_gps.sql` - BD (40 líneas)
- `PHOTO_GPS_CAPTURE.md` - Documentación

**Archivos modificados**: 2
- `orden-soporte/page.tsx` - Integración componente
- `domain.ts` - Tipo WorkOrder

**Tiempo de implementación**: ~45 minutos
**Complejidad**: ⭐⭐⭐ Intermedia

---

## 📱 Compatibilidad

| Navegador | Soporte |
|-----------|---------|
| Chrome | ✅ Soportado |
| Firefox | ✅ Soportado |
| Safari (iOS 15+) | ✅ Soportado |
| Edge | ✅ Soportado |
| IE | ❌ No soportado |

**Nota**: Requiere HTTPS en producción (localhost OK)

---

## 🎯 Próximos Pasos

Después de validar localmente:

1. **npm run build** - Compilación producción
2. **Deployar** a servidor producción
3. **Testar en móvil** con GPS real
4. **Comunicar a técnicos** - Nueva feature disponible

---

**Status**: ✅ Listo para probar  
**Duración estimada de test**: 5-10 minutos  
**Prioridad**: 🔴 Alta (Mejora user experience)
