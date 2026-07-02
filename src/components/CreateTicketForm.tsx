'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { AlertCircle, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const createTicketSchema = z.object({
  description: z.string()
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(500, 'La descripción no puede exceder 500 caracteres'),
  priority: z.enum(['low', 'medium', 'high'], {
    errorMap: () => ({ message: 'Selecciona una prioridad válida' })
  }),
  ticket_type: z.enum(['support', 'installation', 'removal'], {
    errorMap: () => ({ message: 'Selecciona un tipo válido' })
  }),
  technician_id: z.string().uuid('Selecciona un técnico válido'),
  client_name: z.string()
    .min(3, 'El nombre del cliente debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  client_email: z.string().email('Email inválido'),
  client_phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Teléfono inválido')
    .optional()
    .or(z.literal('')),
});

type CreateTicketInput = z.infer<typeof createTicketSchema>;

interface FormErrors {
  [key: string]: string;
}

export function CreateTicketForm({ technicians = [] }: { technicians?: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    priority: 'medium',
    ticket_type: 'support',
    technician_id: '',
    client_name: '',
    client_email: '',
    client_phone: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      // Validar con Zod
      const validatedData = createTicketSchema.parse(formData);

      // Crear ticket en Supabase
      const { error } = await supabase
        .from('tickets')
        .insert([{
          description: validatedData.description,
          priority: validatedData.priority,
          ticket_type: validatedData.ticket_type,
          technician_id: validatedData.technician_id,
          client_name: validatedData.client_name,
          client_email: validatedData.client_email,
          client_phone: validatedData.client_phone || null,
          status: 'pending',
        }]);

      if (error) throw error;

      setSuccess(true);
      setFormData({
        description: '',
        priority: 'medium',
        ticket_type: 'support',
        technician_id: '',
        client_name: '',
        client_email: '',
        client_phone: '',
      });

      setTimeout(() => {
        router.push('/tickets');
      }, 1500);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: FormErrors = {};
        err.errors.forEach(error => {
          const path = error.path[0]?.toString() || 'general';
          fieldErrors[path] = error.message;
        });
        setErrors(fieldErrors);
      } else if (err instanceof Error) {
        setErrors({ general: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="surface-card p-6 text-center max-w-2xl">
        <Check className="w-8 h-8 text-[#346538] mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-[#111111]">Ticket creado</h3>
        <p className="text-[#787774] text-sm mt-1">Redirigiendo a la bandeja de tickets.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="surface-card p-6 md:p-8 stack-lg max-w-4xl">
      <div>
        <p className="eyebrow">Nuevo ticket</p>
        <h1 className="editorial-title text-3xl text-[#111111] mt-2">Registrar un trabajo</h1>
        <p className="mt-2 text-sm text-[#787774] max-w-2xl">
          Completa los datos del cliente y del servicio. La información debe ser clara para que el ticket entre a flujo sin retrabajo.
        </p>
      </div>

      {errors.general && (
        <div className="flex items-start gap-3 rounded-xl border border-[#f3c1c1] bg-[#fdebec] p-4">
          <AlertCircle className="w-5 h-5 text-[#9f2f2d] flex-shrink-0 mt-0.5" />
          <p className="text-[#9f2f2d]">{errors.general}</p>
        </div>
      )}

      <div className="form-grid">
        <div className="full">
          <label htmlFor="client_name">Nombre del Cliente</label>
          <input
            id="client_name"
            name="client_name"
            type="text"
            value={formData.client_name}
            onChange={handleChange}
            placeholder="Nombre completo"
          />
          {errors.client_name && <p className="text-[#9f2f2d] text-sm mt-1">{errors.client_name}</p>}
        </div>

        <div>
          <label htmlFor="client_email">Email del Cliente</label>
          <input
            id="client_email"
            name="client_email"
            type="email"
            value={formData.client_email}
            onChange={handleChange}
            placeholder="correo@ejemplo.com"
          />
          {errors.client_email && <p className="text-[#9f2f2d] text-sm mt-1">{errors.client_email}</p>}
        </div>

        <div>
          <label htmlFor="client_phone">Teléfono del Cliente (Opcional)</label>
          <input
            id="client_phone"
            name="client_phone"
            type="tel"
            value={formData.client_phone}
            onChange={handleChange}
            placeholder="+56912345678"
          />
          {errors.client_phone && <p className="text-[#9f2f2d] text-sm mt-1">{errors.client_phone}</p>}
        </div>

        <div className="full">
          <label htmlFor="description">Descripción del Problema</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={5}
            placeholder="Describe el problema detalladamente (10-500 caracteres)"
          />
          <div className="flex justify-between text-xs text-[#787774] mt-1">
            <span>{formData.description.length}/500</span>
            {errors.description && <span className="text-[#9f2f2d]">{errors.description}</span>}
          </div>
        </div>

        <div>
          <label htmlFor="priority">Prioridad</label>
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
          >
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
          </select>
          {errors.priority && <p className="text-[#9f2f2d] text-sm mt-1">{errors.priority}</p>}
        </div>

        <div>
          <label htmlFor="ticket_type">Tipo de Servicio</label>
          <select
            id="ticket_type"
            name="ticket_type"
            value={formData.ticket_type}
            onChange={handleChange}
          >
            <option value="support">Soporte Técnico</option>
            <option value="installation">Instalación</option>
            <option value="removal">Remoción/Desmontaje</option>
          </select>
          {errors.ticket_type && <p className="text-[#9f2f2d] text-sm mt-1">{errors.ticket_type}</p>}
        </div>

        <div className="full">
          <label htmlFor="technician_id">Técnico Asignado</label>
          <select
            id="technician_id"
            name="technician_id"
            value={formData.technician_id}
            onChange={handleChange}
          >
            <option value="">Seleccionar técnico</option>
            {technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.name}
              </option>
            ))}
          </select>
          {errors.technician_id && <p className="text-[#9f2f2d] text-sm mt-1">{errors.technician_id}</p>}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="primary-btn"
        >
          {loading ? 'Creando ticket...' : 'Crear ticket'}
        </button>
      </div>
    </form>
  );
}
