import { z } from 'zod';

// Esquema para creación de tickets - Alineado con Ticket interface
export const createTicketSchema = z.object({
  ticket_type: z.enum(['support', 'installation', 'removal'])
    .refine(val => ['support', 'installation', 'removal'].includes(val), 'Tipo de ticket inválido'),
  title: z.string()
    .min(3, 'El título debe tener al menos 3 caracteres')
    .max(200, 'El título no puede exceder 200 caracteres'),
  description: z.string()
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(500, 'La descripción no puede exceder 500 caracteres'),
  address: z.string()
    .min(5, 'La dirección debe tener al menos 5 caracteres')
    .max(300, 'La dirección no puede exceder 300 caracteres'),
  priority: z.enum(['low', 'medium', 'high'])
    .refine(val => ['low', 'medium', 'high'].includes(val), 'Prioridad inválida'),
  scheduled_date: z.string()
    .refine(val => !isNaN(Date.parse(val)), 'Fecha inválida'),
  technician_id: z.string()
    .optional()
    .nullable(),
});

// Esquema para actualizar tickets
export const updateTicketSchema = createTicketSchema.partial().extend({
  status: z.enum(['pending', 'assigned', 'in_progress', 'completed', 'not_completed'])
    .optional(),
});

// Esquema para crear técnico
export const createTechnicianSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .max(100),
  name: z.string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100),
  phone: z.string()
    .regex(/^[\d\s\-\+]+$/, 'Teléfono inválido')
    .optional()
    .nullable(),
  specialties: z.array(z.string()).optional(),
});

// Esquema para login
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
  totp_code: z.string()
    .regex(/^\d{6}$/, 'Código TOTP debe ser de 6 dígitos')
    .optional(),
});

// Esquema para perfil
export const updateProfileSchema = z.object({
  name: z.string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100)
    .optional(),
  phone: z.string()
    .regex(/^[\d\s\-\+]+$/, 'Teléfono inválido')
    .optional()
    .nullable(),
  avatar_url: z.string()
    .url('URL de avatar inválida')
    .optional()
    .nullable(),
});

// Esquema para cambiar contraseña
export const changePasswordSchema = z.object({
  current_password: z.string()
    .min(6, 'Contraseña actual requerida'),
  new_password: z.string()
    .min(8, 'Nueva contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número')
    .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial'),
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm_password'],
});

// Tipos exportados para TypeScript
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type CreateTechnicianInput = z.infer<typeof createTechnicianSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
