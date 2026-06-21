# Script de Limpieza de Base de Datos

Script Node.js seguro para eliminar técnicos y datos de prueba antes de pasar a producción.

## ¿Qué hace?

1. **Verifica** cuántos registros hay en cada tabla
2. **Muestra un resumen** de lo que va a eliminar
3. **Pide confirmación** (2 veces para evitar accidentes)
4. **Elimina** todos los datos
5. **Verifica** que la limpieza fue exitosa

## Tablas que elimina

- `technicians` - Técnicos registrados
- `tickets` - Tickets del sistema
- `work_orders` - Órdenes de trabajo completadas
- `work_time_logs` - Logs de tiempo de trabajo
- `work_breaks` - Pausas de trabajo
- `incomplete_reports` - Reportes incompletos

## Cómo ejecutar

### Opción 1: Directo con Node.js

```bash
cd c:\Users\lucas\Desktop\coordinatech-next-main
node scripts/cleanup-db.js
```

### Opción 2: Con npm script

Primero, agrega a `package.json` en la sección "scripts":

```json
"scripts": {
  "cleanup:db": "node scripts/cleanup-db.js"
}
```

Luego ejecuta:

```bash
npm run cleanup:db
```

## Confirmación requerida

El script te pedirá:

1. **Primera confirmación**: Escribe `si`
2. **Segunda confirmación**: Escribe `ELIMINAR TODOS`

Esto es para evitar eliminaciones accidentales.

## ⚠️ Precauciones

- **Haz backup** antes de ejecutar
- **No canceles** el script mientras está ejecutando
- **Verifica** la conexión a Supabase
- **Asegúrate** de tener las variables de entorno configuradas:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Después de limpiar

✅ Ya puedes:
- Registrar nuevos técnicos
- Crear nuevos tickets
- Pasar a producción sin datos de prueba

## Troubleshooting

**Error: "Falta configurar NEXT_PUBLIC_SUPABASE_URL"**
- Verifica el archivo `.env.local` o `.env`
- Asegúrate que están configuradas las variables de Supabase

**Error: "Error al contar technicians"**
- Verifica que tienes acceso a la base de datos
- Comprueba las políticas de RLS en Supabase

**Error: "Error al limpiar tabla X"**
- Algunos registros pueden tener restricciones
- Intenta limpiar manualmente desde Supabase Dashboard
