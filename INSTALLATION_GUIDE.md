# 🛠️ GUÍA DE INSTALACIÓN - WORK TIMER MEJORADO

## Paso 1: Ejecutar la Migración SQL en Supabase

### Opción A: Mediante Supabase Dashboard (Recomendado)

1. **Accede a Supabase:**
   - Ve a https://supabase.com
   - Login con tu cuenta
   - Selecciona tu proyecto

2. **Abre el SQL Editor:**
   - En el menú lateral izquierdo → "SQL Editor"
   - Presiona "+ New Query"

3. **Copia el SQL:**
   - Abre el archivo: `supabase/migration_work_timer.sql`
   - Copia **TODO** el contenido

4. **Pega y Ejecuta:**
   - En el SQL Editor, pega el contenido
   - Presiona el botón "▶️ Run"
   - Espera a ver el mensaje "Success" en verde

5. **Verifica las Tablas:**
   - Ve a "Table Editor" en el menú lateral
   - Verifica que aparezcan:
     - ✅ `work_time_logs`
     - ✅ `work_breaks`
     - ✅ `work_orders`
   - Verifica que la tabla `tickets` tenga nuevas columnas:
     - ✅ `work_started_at`
     - ✅ `work_ended_at`
     - ✅ `completion_type`

### Opción B: Mediante CLI (Avanzado)

```bash
# Si tienes Supabase CLI instalado:
cd /path/to/coordinatech_next
supabase db push

# O manualmente:
supabase sql < supabase/migration_work_timer.sql
```

## Paso 2: Reiniciar la Aplicación

```bash
# Asegúrate de estar en el directorio del proyecto:
cd c:\Users\lucas\Desktop\coordinatech_v1\coordinatech_next

# Detén el servidor actual (Ctrl+C si está corriendo)

# Reinicia el servidor:
npm run dev
```

La aplicación estará disponible en: **http://localhost:3000**

## Paso 3: Probar las Nuevas Funcionalidades

### Test Case 1: Modal de Pausa

1. **Ingresa como Técnico:**
   - Email: `juan.perez@company.com`
   - Contraseña: `tech123`
   - Código 2FA: `123123`

2. **Abre un Ticket Asignado:**
   - Ve a "Tickets"
   - Selecciona un ticket que esté asignado a ti
   - Haz clic para abrir

3. **Prueba el Cronómetro:**
   - Presiona "Iniciar Trabajo"
   - Espera 5 segundos (verás el contador avanzar)
   - Presiona "Pausar"
   
4. **Verifica el Modal Mejorado:**
   ```
   Deberías ver 6 opciones:
   ✅ 🍽️ Colación / Almuerzo
   ✅ 🚗 Desplazamiento
   ✅ 👥 Reunión
   ✅ 📋 Tareas Administrativas
   ✅ ☕ Descanso
   ✅ ✏️ Otro
   ```
   - Selecciona una razón (ej: "Colación")
   - El botón "Pausar" debería activarse
   - Presiona "Pausar Ahora"

5. **Verifica que se Pausó:**
   - El estado debería cambiar a "⏸️ En pausa"
   - Debería aparecer botón "Reanudar"

### Test Case 2: Reanudación y Continuación del SLA

1. **Presiona "Reanudar":**
   - El cronómetro debería reiniciar a 0:00:00
   - El estado debería cambiar a "▶️ En progreso"

2. **Verifica que el SLA Continúa:**
   - Espera 10 segundos
   - El SLA debería acumularse sin contar la pausa

### Test Case 3: Modal de Finalización

1. **Presiona "Finalizar":**
   - Se abre un modal grande con 2 opciones

2. **Verifica que ves:**
   ```
   Opción A:
   ✅ Crear Orden de Soporte
   "Completa el ticket y genera una orden de soporte para seguimiento"
   
   Opción B:
   ⚠️ No Completado
   "El trabajo no está completo - requiere revisión adicional"
   ```

3. **Prueba Opción A (Crear Orden Soporte):**
   - Selecciona "Crear Orden de Soporte"
   - Presiona "Finalizar"
   - El ticket debería cambiar a estado "COMPLETADO"
   - Se crea una orden de soporte automáticamente

4. **Verifica en Órdenes de Trabajo:**
   - Ve a "Órdenes de Trabajo" en el menú
   - Deberías ver la nueva orden creada

### Test Case 4: Razón Personalizada

1. **Inicia nuevamente:**
   - Presiona "Iniciar Trabajo"
   - Espera 5 segundos
   - Presiona "Pausar"

2. **Selecciona "Otro":**
   - Aparecerá un campo de texto
   - Escribe: "Esperando autorización del cliente"
   - Presiona "Pausar Ahora"

3. **Verifica que se Registró:**
   - La razón personalizada debería quedar guardada

## Paso 4: Verificar Datos en Base de Datos (Opcional)

Para verificar que los datos se guardan correctamente:

1. **Ve a Supabase → Table Editor**

2. **Abre la tabla `work_time_logs`:**
   - Deberías ver registros con event_type: 'started', 'paused', 'resumed', 'completed'
   - Cada registro tiene notes con el motivo de la pausa

3. **Abre la tabla `work_breaks`:**
   - Deberías ver registros con break_reason
   - Cada pausa tiene break_start, break_end, break_duration_ms

4. **Abre la tabla `work_orders`:**
   - Deberías ver órdenes creadas cuando finalizaste con "Crear Orden Soporte"

## Solución de Problemas

### ❌ Error: "Table 'work_time_logs' does not exist"
- **Causa**: La migración no se ejecutó correctamente
- **Solución**: 
  1. Ve a Supabase → SQL Editor → New Query
  2. Copia nuevamente todo el contenido de `migration_work_timer.sql`
  3. Presiona "Run"
  4. Espera el mensaje de éxito

### ❌ Error: "Cannot find module 'timeTracking'"
- **Causa**: Caché de módulos no actualizado
- **Solución**:
  1. Detén el servidor (Ctrl+C)
  2. Elimina la carpeta `.next`: `rm -r .next`
  3. Reinicia: `npm run dev`

### ❌ Los modales no aparecen
- **Causa**: Probablemente navegador caché
- **Solución**:
  1. Presiona Ctrl+F5 para limpiar caché
  2. O abre en ventana privada/incógnito

### ❌ El SLA no suma después de reanudar
- **Causa**: Los componentes no se actualizan
- **Solución**:
  1. Verifica que estés usando React 19.2+
  2. Recarga la página (F5)

## ✅ Checklist de Validación

- [ ] Migración SQL ejecutada sin errores
- [ ] Tablas nuevas visibles en Supabase
- [ ] Aplicación reiniciada
- [ ] Puedes ver 6 razones de pausa
- [ ] Puedes seleccionar una razón
- [ ] Modal de finalización muestra 2 opciones
- [ ] Puedes crear orden de soporte
- [ ] Datos se guardan en base de datos

## 🎉 Listo!

Si todos los puntos anteriores funcionan, tu sistema de Work Timer mejorado está completamente operativo.

### Próximos Pasos Recomendados:
1. Entrenar a los técnicos en el nuevo flujo
2. Crear reportes basados en `work_time_logs` y `work_breaks`
3. Analizar patrones de pausas por técnico
4. Optimizar tiempos según datos históricos
