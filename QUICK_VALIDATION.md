# 🧪 CHECKLIST DE VALIDACIÓN RÁPIDA - CoordinaTech

**Objetivo**: Verificar que todas las mejoras están funcionando localmente  
**Tiempo estimado**: 5-10 minutos  
**Servidor**: http://localhost:3000  

---

## ✅ VALIDACIÓN INMEDIATA (Hacer AHORA)

### 1️⃣ Verificar que el Servidor Está Corriendo
```bash
# En terminal, ver si está en ejecución:
# Esperado: "✓ Ready in XXXms"
# Si NO está corriendo: npm run dev
```

**Estado**: ✅ **Servidor activo en http://localhost:3000**

---

### 2️⃣ Validar Cambio en WorkTimer (CRÍTICO)

**Acción**:
1. Abre http://localhost:3000/login
2. Inicia sesión (o login demo)
3. Ve a "Tickets" → Selecciona un ticket
4. Presiona botón de cronómetro

**Verificar DEBE VER**:
- ✅ Botón "Iniciar" (verde)
- ✅ Botón "Pausar" (amarillo) - cuando está corriendo
- ✅ Botón "Reanudar" (verde) - cuando está pausado
- ❌ **NO debe ver** botón "Finalizar" en el cronómetro

**Verificar NO debe VER**:
- ❌ Botón "Finalizar" (rojo) en el WorkTimer
- ❌ Botón "Detener" directo

**Resultado Esperado**: 
```
✅ PASS - Solo ve: Iniciar → Pausar → Reanudar
❌ FAIL - Aún ve botón "Finalizar"
```

**Si Falla**:
- Revisa archivo: `src/components/WorkTimer.tsx` líneas 230, 410
- Debe haber removido ambos botones "Finalizar"

---

### 3️⃣ Validar Flujo de Completación

**Acción**:
1. En ticket con timer corriendo
2. Presiona "Pausar" → Selecciona razón → Confirma
3. Presiona "Reanudar"
4. Ve a sección "Orden de Soporte"
5. Busca botón "Enviar Orden de Soporte"

**Verificar**:
- ✅ Modal de pausa aparece con 6 razones
- ✅ Puedo escribir razón personalizada
- ✅ Modal cierra después de pausar
- ✅ Botón "Reanudar" está visible
- ✅ "Enviar Orden de Soporte" es la ÚNICA forma de finalizar

**Resultado Esperado**:
```
✅ PASS - Flujo completo: Iniciar → Pausar → Reanudar → Orden → Enviar
❌ FAIL - Puedo finalizar desde cronómetro
```

---

### 4️⃣ Validar Alertas Semafóricas SLA

**Acción**:
1. Ve a "Tickets" (listado)
2. Observa cada ticket en la tabla
3. Busca columna de estado SLA

**Verificar Colores**:
- 🟢 **Verde** = SLA OK (más de 30% tiempo restante)
- 🟡 **Amarillo** = Próximo a vencer (15-30% tiempo)
- 🔴 **Rojo** = SLA vencido (< 15% tiempo)
- ⚪ **Gris** = Completado

**Resultado Esperado**:
```
✅ PASS - Veo badges con colores semafóricos
❌ FAIL - No veo cambios de color o no hay badges
```

**Si Falla**:
- Revisa: `src/components/SLAAlertBadge.tsx`
- Verifica: `src/lib/slaCalculations.ts`

---

### 5️⃣ Validar Notificaciones

**Acción**:
1. Abre dos pestañas del navegador (ambas login)
2. En Pestaña A (Admin): Crea un ticket o lo asigna
3. En Pestaña B (Técnico): Espera a ver notificación

**Verificar**:
- ✅ Notificación Toast aparece en Pestaña B
- ✅ Mensaje claro (ej: "Te asignaron ticket ST-XXX")
- ✅ Se cierra automáticamente en 5 segundos
- ✅ No hay errores en consola

**Resultado Esperado**:
```
✅ PASS - Toast notification aparece automáticamente
❌ FAIL - No aparece notificación o hay errores
```

**Si Falla**:
- Abre Developer Tools (F12) → Console
- Busca errores de Supabase
- Revisa: `src/hooks/useNotifications.ts`

---

### 6️⃣ Validar Seguridad (Rate Limiting)

**Acción**:
1. Abre http://localhost:3000/login
2. Intenta login 5 veces con credencial falsa
3. Intenta 6ª vez

**Verificar**:
- ✅ Primeros 5 intentos: Permiten reintentar
- ✅ 6º intento: Mensaje de "demasiados intentos"
- ✅ Debe esperar 10 minutos

**Resultado Esperado**:
```
✅ PASS - Rate limiting activo después de 5 intentos
⚠️  WARNING - No tiene rate limiting
```

---

### 7️⃣ Validar Control de Acceso

**Acción**:
1. Login como Técnico
2. Intenta acceder a `/admin/analytics`
3. O intenta ver ticket de otro técnico

**Verificar**:
- ✅ Técnico NO puede acceder a panel admin
- ✅ Técnico solo ve sus propios tickets
- ✅ Admin puede ver TODO

**Resultado Esperado**:
```
✅ PASS - RBAC funcionando correctamente
❌ FAIL - Técnico puede acceder a áreas admin
```

---

## 📊 Tabla de Resultados

| Prueba | Esperado | Resultado | Acción |
|--------|----------|-----------|--------|
| Servidor | ✅ Corriendo | ✅ | OK |
| WorkTimer | ❌ Sin "Finalizar" | [ ] | Validar |
| Flujo Completación | ✅ Via Orden | [ ] | Validar |
| SLA Semafóricas | 🟢🟡🔴 Colores | [ ] | Validar |
| Notificaciones | ✅ Toast RT | [ ] | Validar |
| Rate Limiting | ✅ Activo | [ ] | Validar |
| RBAC | ✅ Por rol | [ ] | Validar |

---

## 🔴 Si Algo Falla

### WorkTimer sigue teniendo "Finalizar"
```bash
# 1. Revisa que los cambios se guardaron:
git status
# Debe mostrar: WorkTimer.tsx modificado

# 2. Recarga el navegador (Ctrl+Shift+R - caché limpia)
# 3. Si sigue fallando: Reinicia servidor (npm run dev)
```

### No ves SLA semafóricas
```bash
# 1. Abre DevTools (F12)
# 2. Ve a Console
# 3. Busca errores en el cálculo de SLA
# 4. Verifica tickets tienen prioridad (high/medium/low)
```

### Notificaciones no llegan
```bash
# 1. Revisa conexión a Supabase
# 2. Abre Console (F12)
# 3. Busca: "useNotifications subscription"
# 4. Si hay error: Verifica variables de .env
```

### Rate limiting no funciona
```bash
# 1. Abre DevTools → Application → LocalStorage
# 2. Busca clave: "coordinatech_rate_limit"
# 3. Debe actualizar después de cada intento
```

---

## ✅ Si TODO Pasa

**Resultado**: ✅ **LISTO PARA PRODUCCIÓN**

Próximo paso:
```bash
# 1. Compilar para producción
npm run build

# 2. Ejecutar linter
npm run lint

# 3. Si TODO pasa sin errores:
#    → Proceder a deploy en servidor de producción
```

---

## 📝 Notas Importantes

### Puntos Clave de Validación
1. **WorkTimer**: Remover botón "Finalizar" = **CRÍTICO** ✅
2. **SLA**: Colores semafóricos = **IMPORTANTE** ✅
3. **Notificaciones**: Comunicación RT = **IMPORTANTE** ✅
4. **Seguridad**: Rate limiting + RBAC = **IMPORTANTE** ✅

### Si Necesitas Ayuda
- Revisa: `PRODUCTION_IMPROVEMENTS.md`
- O: `IMPLEMENTATION_STATUS.md`

---

**Última actualización**: 2026-06-15  
**Responsable**: Sistema de QA  
**Status**: Listo para validación manual

✅ **¡Procede con validación!**
