# 🔒 Guía de Seguridad - CoordinaTech

## Implementado ✅

### Autenticación
- [x] **2FA (Two-Factor Authentication)**
  - 6 dígitos
  - Código demo: [consultar con administrador]
  - Interfaz profesional con 6 casillas
  - Auto-advance entre campos
  - Soporte para paste
  - Cancelar y volver atrás

- [x] **Rate Limiting en Login**
  - Máximo 5 intentos en 10 minutos
  - Bloqueo temporal después de exceder
  - Contador de intentos restantes
  - Reset automático después de ventana

- [x] **Session Timeout**
  - 30 minutos de inactividad
  - Auto-refresh en actividad del usuario
  - Event listeners: mouse, keyboard, click, touch
  - Logout automático al expirar

- [x] **Recuperación de Contraseña**
  - Página dedicada
  - Envío de enlace por email
  - Confirmación visual
  - Volver a enviar opción

### Validación de Entrada
- [x] Email validation
- [x] Formato de contraseña (placeholder)
- [ ] Validación de contraseña fuerte (preparada pero no integrada)

---

## Por Implementar 🚨

### CRÍTICO (Antes de Producción)

#### 1. Contraseña Fuerte - Validación
```typescript
// Ya existe en lib/security.ts - Integrar en perfil de usuario
const validation = PasswordValidation.validate(password);
// Requisitos:
// - Mínimo 8 caracteres
// - 1 mayúscula
// - 1 minúscula
// - 1 número
// - 1 carácter especial
```

#### 2. Hash de Contraseña en Backend
**IMPORTANTE:** Las contraseñas NUNCA deben guardarse en texto plano.
```sql
-- En Supabase, usar: pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Almacenar: crypt(password, gen_salt('bf'))
-- Validar: password = crypt(submitted_password, password_hash)
```

#### 3. Encriptación de Datos Sensibles
```typescript
// Implementar en campos:
- Email (encriptado en BD)
- Teléfono (encriptado en BD)
- Documentos sensibles

// Usar: NaCl.js o libsodium.js
import nacl from 'tweetnacl';
```

#### 4. HTTPS Obligatorio
```typescript
// next.config.ts
module.exports = {
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
};
```

#### 5. Logs de Auditoría
```typescript
// Crear tabla en Supabase
create table audit_logs (
  id uuid primary key,
  user_id text references technicians(id),
  action text,
  resource text,
  old_values jsonb,
  new_values jsonb,
  timestamp timestamptz default now(),
  ip_address text
);

// Registrar todo:
- Login/Logout
- CRUD de tickets
- CRUD de técnicos
- Upload de documentos
- Cambios de estado
```

#### 6. Backup Automático
```typescript
// Configurar en Supabase
- Daily backups (automático)
- Point-in-time recovery
- Pruebas de restore mensuales
```

---

## Mejores Prácticas por Implementar

### 1. CORS Configuration
```typescript
// lib/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};
```

### 2. Content Security Policy (CSP)
```typescript
// next.config.ts
{
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
        },
      ],
    },
  ],
}
```

### 3. Rate Limiting por IP
```typescript
// middleware.ts
import { rateLimit } from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 5,
  message: 'Demasiados intentos',
});
```

### 4. API Authentication
```typescript
// Implementar API Keys o JWT
- Header: Authorization: Bearer {token}
- Tokens corta duración (1 hora)
- Refresh tokens (7 días)
- Revoke en logout
```

### 5. Input Validation & Sanitization
```typescript
// Usar: zod o yup para validación
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
});
```

### 6. SQL Injection Prevention
```typescript
// ✅ CORRECTO - Parámetros
const { data } = await supabase
  .from('tickets')
  .select()
  .eq('id', ticketId);

// ❌ INCORRECTO - Concatenación
const query = `SELECT * FROM tickets WHERE id = '${id}'`;
```

### 7. XSS Prevention
```typescript
// ✅ CORRECTO - React escapa automáticamente
<p>{userInput}</p>

// ❌ INCORRECTO - HTML sin escapar
<p dangerouslySetInnerHTML={{ __html: userInput }} />
```

### 8. CSRF Protection
```typescript
// Implementar tokens CSRF
// next-csrf o cookie-based CSRF
```

### 9. Dependencias Seguras
```bash
# Auditar periódicamente
npm audit

# Actualizar dependencias
npm update

# Revisar changelog antes de actualizar
```

### 10. Error Handling
```typescript
// ✅ CORRECTO - No exponer detalles internos
throw new Error("Credenciales inválidas");

// ❌ INCORRECTO - Exponer información sensible
throw new Error("User not found in database: SELECT * FROM technicians WHERE id='xyz'");
```

---

## Checklist de Seguridad Pre-Deployment

### Antes de ir a Producción

- [ ] Hash de contraseña implementado en backend
- [ ] Encriptación de datos sensibles en BD
- [ ] HTTPS con certificado válido
- [ ] Logs de auditoría completos
- [ ] Backup automático funcionando
- [ ] Rate limiting probado
- [ ] Session timeout probado
- [ ] 2FA funcionando en todos los browsers
- [ ] Recuperación de contraseña funcionando
- [ ] CORS configurado correctamente
- [ ] CSP headers configurados
- [ ] Input validation en todos los forms
- [ ] No hay passwords en localStorage
- [ ] No hay tokens sensibles expuestos
- [ ] Environment variables no comiteadas
- [ ] Secrets seguros en CI/CD
- [ ] Database replicas configuradas
- [ ] Monitoring y alertas activas
- [ ] Rollback plan documentado

---

## Código de Ejemplo: Integración Completa

### Login Seguro Completo

```typescript
// pages/login/page.tsx
import { LoginRateLimiter, SessionTimeoutManager, PasswordValidation } from '@/lib/security';

export default function SecureLogin() {
  const handleLogin = async (email: string, password: string) => {
    // 1. Rate limiting
    if (LoginRateLimiter.isLimited()) {
      throw new Error("Demasiados intentos. Espera e intenta de nuevo.");
    }

    // 2. Validación de entrada
    if (!email || !password) {
      throw new Error("Email y contraseña requeridos");
    }

    // 3. Llamar a API seguro
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      LoginRateLimiter.recordAttempt();
      throw new Error("Credenciales inválidas");
    }

    // 4. Success: start session
    const { session } = await response.json();
    SessionTimeoutManager.startSession();
    LoginRateLimiter.reset();
    
    // 5. Mostrar 2FA
    return session;
  };
}
```

---

## Monitoreo Post-Deployment

### Métricas Críticas
- [ ] Tasa de fallos de login (debe ser < 1%)
- [ ] Intentos de brute force bloqueados
- [ ] Usuarios expulsados por timeout
- [ ] Errores no capturados
- [ ] Tiempos de respuesta API
- [ ] Uso de base de datos
- [ ] Intentos de SQL injection
- [ ] Solicitudes no autorizadas

---

## Contactos de Seguridad

- **Security Email:** security@coordinatech.com
- **Hotline:** +XX-XXX-XXXX-XXX
- **Incident Response:** 24/7 disponible
- **Responsable:** [Nombre del CTO/Security Lead]

---

**Versión:** 1.0  
**Última actualización:** 2026-06-05  
**Próxima revisión:** 2026-09-05  

---

## Enlaces Útiles

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [Next.js Security](https://nextjs.org/docs/guides/security)
- [Web.dev - Seguridad](https://web.dev/security/)
