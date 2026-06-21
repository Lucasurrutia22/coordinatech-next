# Coordinatech Next

Reimplementacion de Coordinatech con stack moderno:

- Next.js (App Router)
- Supabase (DB)
- TypeScript
- Tailwind CSS 4 + CSS custom para UI profesional

## Funcionalidad incluida

- Login por rol (tecnico/admin)
- Dashboard con metricas operativas
- Modulo de tickets
- Crear, listar, editar y ver detalle de ticket
- Modulo de tecnicos (admin)
- Calendario/agenda operativa
- Perfil de usuario
- Fallback local (si no configuras Supabase aun)

## Credenciales demo

> ⚠️ **NOTA DE SEGURIDAD**: Las credenciales de demostración NO deben estar visibles en documentación pública.
> Para acceder al sistema, contacta con el administrador del proyecto.

## Setup rapido

1. Instalar dependencias:

```bash
npm install
```

2. Configurar variables:

```bash
cp .env.example .env.local
```

Completa `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

3. Crear tablas en Supabase SQL Editor con [supabase/schema.sql](supabase/schema.sql).

4. Ejecutar proyecto:

```bash
npm run dev
```

Abrir `http://localhost:3000`.

## Notas de migracion desde tu app anterior

- Este proyecto mantiene el flujo funcional principal (roles, tickets, tecnicos).
- La UI fue rediseñada para verse mas profesional y consistente.
- La autenticacion esta implementada para demo y migracion rapida.
	Para produccion, se recomienda mover a Supabase Auth con RLS.
