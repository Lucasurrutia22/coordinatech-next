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
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <Check className="w-8 h-8 text-green-600 mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-green-800">Ticket creado exitosamente</h3>
        <p className="text-green-700 text-sm mt-1">Redirigiendo...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{errors.general}</p>
        </div>
      )}

      {/* Nombre del cliente */}
      <div>
        <label htmlFor="client_name" className="block text-sm font-medium text-gray-700 mb-2">
          Nombre del Cliente
        </label>
        <input
          id="client_name"
          name="client_name"
          type="text"
          value={formData.client_name}
          onChange={handleChange}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
            errors.client_name 
              ? 'border-red-300 focus:ring-red-200' 
              : 'border-gray-300 focus:ring-blue-200'
          }`}
          placeholder="Nombre completo"
        />
        {errors.client_name && <p className="text-red-600 text-sm mt-1">{errors.client_name}</p>}
      </div>

      {/* Email del cliente */}
      <div>
        <label htmlFor="client_email" className="block text-sm font-medium text-gray-700 mb-2">
          Email del Cliente
        </label>
        <input
          id="client_email"
          name="client_email"
          type="email"
          value={formData.client_email}
          onChange={handleChange}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
            errors.client_email 
              ? 'border-red-300 focus:ring-red-200' 
              : 'border-gray-300 focus:ring-blue-200'
          }`}
          placeholder="correo@ejemplo.com"
        />
        {errors.client_email && <p className="text-red-600 text-sm mt-1">{errors.client_email}</p>}
      </div>

      {/* Teléfono (opcional) */}
      <div>
        <label htmlFor="client_phone" className="block text-sm font-medium text-gray-700 mb-2">
          Teléfono del Cliente (Opcional)
        </label>
        <input
          id="client_phone"
          name="client_phone"
          type="tel"
          value={formData.client_phone}
          onChange={handleChange}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
            errors.client_phone 
              ? 'border-red-300 focus:ring-red-200' 
              : 'border-gray-300 focus:ring-blue-200'
          }`}
          placeholder="+56912345678"
        />
        {errors.client_phone && <p className="text-red-600 text-sm mt-1">{errors.client_phone}</p>}
      </div>

      {/* Descripción */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Descripción del Problema
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 font-mono text-sm ${
            errors.description 
              ? 'border-red-300 focus:ring-red-200' 
              : 'border-gray-300 focus:ring-blue-200'
          }`}
          placeholder="Describe el problema detalladamente (10-500 caracteres)"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{formData.description.length}/500</span>
          {errors.description && <span className="text-red-600">{errors.description}</span>}
        </div>
      </div>

      {/* Prioridad */}
      <div>
        <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
          Prioridad
        </label>
        <select
          id="priority"
          name="priority"
          value={formData.priority}
          onChange={handleChange}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
            errors.priority 
              ? 'border-red-300 focus:ring-red-200' 
              : 'border-gray-300 focus:ring-blue-200'
          }`}
        >
          <option value="low">Baja</option>
          <option value="medium">Media</option>
          <option value="high">Alta</option>
        </select>
        {errors.priority && <p className="text-red-600 text-sm mt-1">{errors.priority}</p>}
      </div>

      {/* Tipo de ticket */}
      <div>
        <label htmlFor="ticket_type" className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Servicio
        </label>
        <select
          id="ticket_type"
          name="ticket_type"
          value={formData.ticket_type}
          onChange={handleChange}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
            errors.ticket_type 
              ? 'border-red-300 focus:ring-red-200' 
              : 'border-gray-300 focus:ring-blue-200'
          }`}
        >
          <option value="support">Soporte Técnico</option>
          <option value="installation">Instalación</option>
          <option value="removal">Remoción/Desmontaje</option>
        </select>
        {errors.ticket_type && <p className="text-red-600 text-sm mt-1">{errors.ticket_type}</p>}
      </div>

      {/* Técnico asignado */}
      <div>
        <label htmlFor="technician_id" className="block text-sm font-medium text-gray-700 mb-2">
          Técnico Asignado
        </label>
        <select
          id="technician_id"
          name="technician_id"
          value={formData.technician_id}
          onChange={handleChange}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
            errors.technician_id 
              ? 'border-red-300 focus:ring-red-200' 
              : 'border-gray-300 focus:ring-blue-200'
          }`}
        >
          <option value="">-- Selecciona un técnico --</option>
          {technicians.map(tech => (
            <option key={tech.id} value={tech.id}>
              {tech.name}
            </option>
          ))}
        </select>
        {errors.technician_id && <p className="text-red-600 text-sm mt-1">{errors.technician_id}</p>}
      </div>

      {/* Botones */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition"
        >
          {loading ? 'Creando...' : 'Crear Ticket'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
