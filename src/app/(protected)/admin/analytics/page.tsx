'use client';

import { AdminAnalyticsDashboard } from '@/components/AdminAnalyticsDashboard';
import { useState } from 'react';
import { Calendar } from 'lucide-react';

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState(30);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Panel de Análisis de Tiempos</h1>
          <p className="text-gray-600 mt-1">
            Monitoreo detallado de productividad y eficiencia de técnicos
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
          <Calendar className="w-5 h-5 text-gray-600" />
          <select
            value={days}
            onChange={e => setDays(parseInt(e.target.value))}
            className="font-medium text-gray-900 bg-transparent focus:outline-none"
          >
            <option value={7}>Últimos 7 días</option>
            <option value={14}>Últimas 2 semanas</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
          </select>
        </div>
      </div>

      {/* Dashboard */}
      <AdminAnalyticsDashboard days={days} />

      {/* Info boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">📊 Métrica de Eficiencia</h3>
          <p className="text-sm text-blue-700">
            La eficiencia se calcula como el porcentaje de tiempo activo vs tiempo total. Un 100%
            indicaría trabajo sin pausas.
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-2">✅ Tiempo Activo</h3>
          <p className="text-sm text-green-700">
            Es el tiempo desde el inicio del trabajo hasta el fin, descontando todas las pausas
            registradas.
          </p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">⏸️ Pausas Registradas</h3>
          <p className="text-sm text-yellow-700">
            Cada pausa registra la razón y duración exacta. Útil para auditoría y mejora continua.
          </p>
        </div>
      </div>

      {/* Instrucciones */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-indigo-900 mb-4">📋 Cómo Usar Este Panel</h2>
        <div className="space-y-3 text-sm text-indigo-800">
          <p>
            ✓ <strong>Selecciona el período:</strong> Elige entre 7, 14, 30 o 90 días para analizar
            diferentes períodos.
          </p>
          <p>
            ✓ <strong>Haz clic en un técnico:</strong> Para ver sus estadísticas detalladas en una
            tarjeta expandida.
          </p>
          <p>
            ✓ <strong>Analiza eficiencia:</strong> Identifica a los técnicos con mejor/peor
            eficiencia.
          </p>
          <p>
            ✓ <strong>Monitorea pausas:</strong> Verifica si las pausas son razonables o si hay
            patrones.
          </p>
          <p>
            ✓ <strong>Detecta anomalías:</strong> Busca técnicos con tiempo promedio muy alto o
            bajo.
          </p>
        </div>
      </div>
    </div>
  );
}
